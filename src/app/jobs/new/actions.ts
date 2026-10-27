"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

export type PostState = { error?: string };

const int = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

export async function publishJob(_prev: PostState, form: FormData): Promise<PostState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/new");

  const sub = Number(form.get("sub"));
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const mode = String(form.get("mode") ?? "") as "onsite" | "remote" | "both";
  const city = String(form.get("city") ?? "").trim();
  const budgetType = String(form.get("budgetType") ?? "") as "fixed" | "hourly" | "open_to_quotes";
  const min = int(form.get("min"));
  const max = int(form.get("max")) ?? min;
  const timeline = String(form.get("timeline") ?? "") as "asap" | "week" | "month" | "flexible";
  const startDate = String(form.get("startDate") ?? "") || null;
  const skills = String(form.get("skills") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
  const attachments = form.getAll("attachment").map(String).filter((p) => p.startsWith(`${user.id}/`) && !p.includes("..")).slice(0, 3);

  if (!Number.isInteger(sub) || sub <= 0) return { error: "יש לבחור תחום." };
  if (title.length < 5 || title.length > 80) return { error: "כותרת של 5 עד 80 תווים." };
  if (description.length < 50) return { error: "תיאור של 50 תווים לפחות — כך נותני השירות יבינו מה צריך." };
  if (!["onsite", "remote", "both"].includes(mode)) return { error: "יש לבחור איפה העבודה מתבצעת." };
  if (mode !== "remote" && city.length < 2) return { error: "יש להזין עיר." };
  if (!["fixed", "hourly", "open_to_quotes"].includes(budgetType)) return { error: "יש לבחור סוג תקציב." };
  if (budgetType !== "open_to_quotes" && (!min || !max || min > max)) return { error: "יש להזין טווח תקציב תקין." };
  if (!["asap", "week", "month", "flexible"].includes(timeline)) return { error: "יש לבחור מתי." };

  const { data: id, error } = await supabase.rpc("create_job", {
    p_subcategory: sub,
    p_title: title,
    p_description: description,
    p_mode: mode,
    p_city: mode === "remote" ? "" : city,
    p_budget_type: budgetType,
    p_budget_min: budgetType === "open_to_quotes" ? (null as never) : min!,
    p_budget_max: budgetType === "open_to_quotes" ? (null as never) : max!,
    p_timeline: timeline,
    p_start_date: startDate ?? undefined,
    p_skills: skills,
    p_attachment_paths: attachments,
  });
  if (error) return { error: appErrorMessage(error) };
  redirect(`/poster/jobs/${id}?posted=1`);
}
