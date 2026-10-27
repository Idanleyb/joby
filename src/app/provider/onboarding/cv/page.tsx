import type { Metadata } from "next";
import { requireProvider } from "@/lib/provider";
import { WizardShell } from "@/components/wizard-shell";
import { CvStep } from "./cv-step";

export const metadata: Metadata = { title: "קורות חיים · Joby" };

export default async function CvPage() {
  const { me, provider } = await requireProvider();
  return (
    <WizardShell
      current="cv"
      reached={provider.onboarding_step}
      title="קורות חיים"
      subtitle="העלו קורות חיים ונמלא עבורכם את הפרופיל — תוכלו לבדוק ולתקן הכל. לא חובה."
    >
      <CvStep userId={me.userId} hasCv={Boolean(provider.cv_path)} hasProfileData={Boolean(provider.headline || provider.bio)} />
    </WizardShell>
  );
}
