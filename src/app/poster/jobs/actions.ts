"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

type R = { error?: string };

async function call(fn: string, args: Record<string, unknown>, paths: string[]): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn as never, args as never);
  if (error) return { error: appErrorMessage(error) };
  paths.forEach((p) => revalidatePath(p));
  return {};
}

const jobPaths = (jobId: string) => ["/poster/jobs", `/poster/jobs/${jobId}`, `/jobs/${jobId}`];
const appPaths = (jobId: string, appId: string) => [...jobPaths(jobId), `/poster/jobs/${jobId}/applications/${appId}`];

export const extendJob = async (jobId: string) => call("extend_job", { p_job: jobId }, jobPaths(jobId));
export const closeJob = async (jobId: string) => call("close_job", { p_job: jobId }, jobPaths(jobId));

export const shortlistApp = async (jobId: string, appId: string, on: boolean) =>
  call("shortlist_application", { p_app: appId, p_on: on }, appPaths(jobId, appId));
export const declineApp = async (jobId: string, appId: string) => call("decline_application", { p_app: appId }, appPaths(jobId, appId));
export const contactApp = async (jobId: string, appId: string) => call("contact_applicant", { p_app: appId }, appPaths(jobId, appId));
export const hireApp = async (jobId: string, appId: string) => call("hire_application", { p_app: appId }, appPaths(jobId, appId));
export const requestExtraHire = async (jobId: string, appId: string) => call("request_extra_hire", { p_app: appId }, appPaths(jobId, appId));

/** Opening the application detail stops the 30-day credit-back timer (PRD 5.10). Called from an effect, never during render. */
export async function markViewed(jobId: string, appId: string): Promise<R> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_application_viewed", { p_app: appId });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath(`/poster/jobs/${jobId}`);
  return {};
}
