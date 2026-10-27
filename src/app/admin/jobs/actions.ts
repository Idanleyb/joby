"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

type R = { error?: string };

export async function releaseJob(jobId: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_release_job", { p_job: jobId });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/admin/jobs");
  return {};
}

export async function removeJob(jobId: string, reason: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_remove_job", { p_job: jobId, p_reason: reason });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/admin/jobs");
  return {};
}

export async function decideExtraHire(requestId: string, approve: boolean): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_extra_hire", { p_request: requestId, p_approve: approve });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/admin/extra-hires");
  return {};
}
