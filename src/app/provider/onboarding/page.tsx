import { redirect } from "next/navigation";
import { requireProvider, stepPath, WIZARD_STEPS } from "@/lib/provider";

/** Resume the wizard where the provider left off. */
export default async function WizardRouter() {
  const { provider } = await requireProvider();
  const step = WIZARD_STEPS.find((s) => s.n === provider.onboarding_step) ?? WIZARD_STEPS[0];
  redirect(provider.onboarding_step >= 8 ? "/account" : stepPath(step.slug));
}
