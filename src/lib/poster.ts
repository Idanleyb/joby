import "server-only";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";

/** Signed-in poster with a completed poster profile — or redirect. */
export async function requirePoster(next: string) {
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(next)}`);
  const step = nextStep(me);
  if (step === "/onboarding/phone" || step === "/onboarding/welcome") redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  if (!me.hasPosterProfile) redirect("/onboarding/poster");
  return me;
}
