import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { safeNext } from "@/lib/next-param";

/** Sends the user to the next onboarding step (or home / the page they came for). */
export default async function OnboardingRouter({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const step = nextStep(await getMe());
  if (step === "/account") redirect(next ?? "/home");
  if (next && (step === "/onboarding/phone" || step === "/onboarding/email" || step === "/onboarding/welcome")) redirect(`${step}?next=${encodeURIComponent(next)}`);
  redirect(step);
}
