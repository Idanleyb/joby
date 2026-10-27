import type { Metadata } from "next";
import { requireProvider } from "@/lib/provider";
import { WizardShell } from "@/components/wizard-shell";
import { AreaForm } from "./area-form";

export const metadata: Metadata = { title: "אזור עבודה · Joby" };

export default async function AreaPage() {
  const { provider: p } = await requireProvider();
  return (
    <WizardShell current="area" reached={p.onboarding_step} title="איפה אתם עובדים?">
      <AreaForm
        initial={{
          onsite: p.works_onsite,
          remote: p.works_remote,
          city: p.city ?? "",
          radius: p.works_onsite && p.radius_km == null ? "nationwide" : String(p.radius_km ?? 25),
        }}
      />
    </WizardShell>
  );
}
