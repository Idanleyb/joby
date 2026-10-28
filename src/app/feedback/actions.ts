"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

export type FeedbackState = { error?: string };
const score = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined;
};

export async function submitFeedback(engagementId: string, _prev: FeedbackState, form: FormData): Promise<FeedbackState> {
  const worked = String(form.get("worked") ?? "") as "yes" | "not_yet" | "no";
  if (!["yes", "not_yet", "no"].includes(worked)) return { error: "יש לבחור אם עבדתם יחד." };
  const overall = score(form.get("overall"));
  if (worked === "yes" && !overall) return { error: "יש לתת דירוג כללי (1 עד 5 כוכבים)." };
  const comment = String(form.get("comment") ?? "").trim();
  if (comment.length > 500) return { error: "התגובה ארוכה מ-500 תווים." };
  const scores = Object.fromEntries(
    ["quality", "communication", "reliability", "value_for_money", "brief_clarity", "fair_payment"]
      .map((k) => [k, score(form.get(k))]).filter(([, v]) => v !== undefined),
  );
  const again = form.get("again");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_feedback", {
    p_engagement: engagementId,
    p_worked_together: worked,
    p_overall: worked === "yes" ? overall : undefined,
    p_scores: worked === "yes" ? scores : {},
    p_would_again: worked === "yes" && again ? again === "yes" : undefined,
    p_comment: worked === "yes" ? comment || undefined : undefined,
    p_no_reason: worked === "no" ? String(form.get("noReason") ?? "other") : undefined,
    p_private_note: String(form.get("note") ?? "").trim().slice(0, 1000) || undefined,
  });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/", "layout");
  redirect(`/feedback?done=${worked}`);
}
