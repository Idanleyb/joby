"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

export async function toggleSave(jobId: string, save: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/jobs/${jobId}`);
  const { error } = save
    ? await supabase.from("job_saves").upsert({ user_id: user.id, job_id: jobId }, { onConflict: "user_id,job_id", ignoreDuplicates: true })
    : await supabase.from("job_saves").delete().eq("user_id", user.id).eq("job_id", jobId);
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export type ApplyState = { error?: string };

export async function applyToJob(jobId: string, _prev: ApplyState, form: FormData): Promise<ApplyState> {
  const supabase = await createClient();
  const pitch = String(form.get("pitch") ?? "").trim();
  const price = Number(String(form.get("price") ?? "").replace(/\D/g, "")) || null;
  const from = String(form.get("availableFrom") ?? "") || null;
  const card = String(form.get("serviceCard") ?? "") || null;
  if (pitch.length < 50 || pitch.length > 1000) return { error: "הפנייה צריכה להיות באורך 50 עד 1000 תווים." };

  const { error } = await supabase.rpc("apply_to_job", {
    p_job: jobId, p_pitch: pitch, p_proposed_price: price ?? undefined, p_available_from: from ?? undefined, p_service_card: card ?? undefined,
  });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/provider/applications");
  redirect(`/jobs/${jobId}?applied=1`);
}

export async function withdrawApplication(appId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_application", { p_app: appId });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/provider/applications");
  return {};
}
