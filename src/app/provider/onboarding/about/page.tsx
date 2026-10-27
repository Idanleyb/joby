import type { Metadata } from "next";
import { requireProvider } from "@/lib/provider";
import { WizardShell } from "@/components/wizard-shell";
import { AboutForm } from "./about-form";

export const metadata: Metadata = { title: "קצת עליך · Joby" };

export default async function AboutPage() {
  const { provider: p } = await requireProvider();
  return (
    <WizardShell current="about" reached={p.onboarding_step} title="ספרו קצת על עצמכם" subtitle="זה מה שמפרסמים יקראו לפני שיפנו אליכם.">
      <AboutForm
        initial={{
          headline: p.headline ?? "",
          bio: p.bio ?? "",
          years: p.years_experience == null ? "" : String(p.years_experience),
          languages: p.languages ?? [],
          portfolio: (p.portfolio_links ?? []).join("\n"),
        }}
      />
    </WizardShell>
  );
}
