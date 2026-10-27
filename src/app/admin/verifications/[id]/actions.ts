"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

export type DecideState = { error?: string };

export async function decide(_prev: DecideState, form: FormData): Promise<DecideState> {
  const id = String(form.get("id") ?? "");
  const decision = String(form.get("decision") ?? "");
  const reasonCode = String(form.get("reason") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 500);
  const days = Number(String(form.get("days") ?? "").replace(/\D/g, "")) || null;
  if (!["approved", "rejected", "more_info"].includes(decision)) return { error: "החלטה לא תקינה." };

  const reason =
    decision === "approved" ? note || null
    : decision === "more_info" ? note
    : reasonCode && reasonCode !== "other" ? reasonCode
    : note;
  if (decision !== "approved" && !reason) return { error: "יש לציין סיבה." };

  const supabase = await createClient();
  const { data: files, error } = await supabase.rpc("decide_verification", {
    p_request: id,
    p_decision: decision as "approved",
    p_reason: reason ?? undefined,
    p_days_total: days ?? undefined,
  });
  if (error) return { error: appErrorMessage(error) };

  // PRD 5.3: documents are deleted after the decision; only the result is kept.
  if (decision !== "more_info" && files?.length) {
    const admin = createServiceClient();
    const { error: rmError } = await admin.storage.from("verification-docs").remove(files);
    if (!rmError) await admin.rpc("mark_documents_deleted", { p_request: id });
    else console.error("document deletion failed", id, rmError);
  }
  redirect("/admin/verifications");
}
