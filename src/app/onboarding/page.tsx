import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";

/** Sends the user to the next onboarding step (or their account when done). */
export default async function OnboardingRouter() {
  redirect(nextStep(await getMe()));
}
