"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

export type RequestState = { error?: string };

const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Poster sends a direct request to a provider (Flow B, PRD 5.11). */
export async function sendRequest(providerId: string, _prev: RequestState, form: FormData): Promise<RequestState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/providers/${providerId}/request`);

  const sub = Number(form.get("sub"));
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const mode = String(form.get("mode") ?? "") as "onsite" | "remote" | "both";
  const city = String(form.get("city") ?? "").trim();
  const budgetType = String(form.get("budgetType") ?? "") as "fixed" | "hourly" | "open_to_quotes";
  const min = int(form.get("min"));
  const max = int(form.get("max")) ?? min;
  const timeline = String(form.get("timeline") ?? "") as "asap" | "week" | "month" | "flexible";
  const job = String(form.get("job") ?? "") || null;

  if (!Number.isInteger(sub) || sub <= 0) return { error: "יש לבחור תחום." };
  if (title.length < 5 || title.length > 80) return { error: "כותרת של 5 עד 80 תווים." };
  if (description.length < 20 || description.length > 1000) return { error: "תיאור של 20 עד 1000 תווים." };
  if (!["onsite", "remote", "both"].includes(mode)) return { error: "יש לבחור איפה העבודה מתבצעת." };
  if (mode !== "remote" && city.length < 2) return { error: "יש להזין עיר." };
  if (!["fixed", "hourly", "open_to_quotes"].includes(budgetType)) return { error: "יש לבחור סוג תקציב." };
  if (budgetType !== "open_to_quotes" && (!min || !max || min > max)) return { error: "יש להזין טווח תקציב תקין." };
  if (!["asap", "week", "month", "flexible"].includes(timeline)) return { error: "יש לבחור מתי." };

  const { error } = await supabase.rpc("send_direct_request", {
    p_provider: providerId,
    p_subcategory: sub,
    p_title: title,
    p_description: description,
    p_mode: mode,
    p_city: mode === "remote" ? "" : city,
    p_budget_type: budgetType,
    p_budget_min: budgetType === "open_to_quotes" ? (null as never) : min!,
    p_budget_max: budgetType === "open_to_quotes" ? (null as never) : max!,
    p_timeline: timeline,
    p_job: job ?? undefined,
  });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/poster/requests");
  redirect("/poster/requests?sent=1");
}

/** Provider approves (2 credits, contacts revealed) or declines (free). */
export async function respondRequest(requestId: string, approve: boolean, reason?: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_direct_request", { p_request: requestId, p_approve: approve, p_reason: reason || undefined });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/proposals");
  revalidatePath("/", "layout");
  return {};
}
