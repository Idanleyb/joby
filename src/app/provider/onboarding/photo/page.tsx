import type { Metadata } from "next";
import Link from "next/link";
import { profileStrength, requireProvider, stepPath } from "@/lib/provider";
import { loadProviderView } from "@/lib/provider-view";
import { ProviderProfile } from "@/components/provider-profile";
import { WizardShell } from "@/components/wizard-shell";
import { Card } from "@/components/ui";
import { DaysBandToggle, FinishButton, PhotoUpload } from "./photo-controls";

export const metadata: Metadata = { title: "תמונה וסיום · Joby" };

export default async function PhotoPage() {
  const { me, provider } = await requireProvider();
  const p = (await loadProviderView(me.userId))!;
  const strength = profileStrength({
    verification: p.verification_status,
    headline: p.headline,
    bio: p.bio,
    subcategories: p.subcategories.length,
    skills: p.skills.length,
    photo: Boolean(p.photo_path),
    cv: Boolean(p.cv_path),
    services: p.services.length,
    portfolio: p.portfolio_links?.length ?? 0,
  });
  const missing = [
    !["pending", "approved"].includes(p.verification_status) && { label: "אימות שירות", href: stepPath("proof") },
    !p.subcategories.length && { label: "תחומים", href: stepPath("categories") },
    !(p.works_onsite || p.works_remote) && { label: "אזור עבודה", href: stepPath("area") },
    !(p.headline && p.bio) && { label: "כותרת ותיאור", href: stepPath("about") },
  ].filter((x): x is { label: string; href: string } => Boolean(x));

  return (
    <WizardShell current="photo" reached={provider.onboarding_step} title="תמונה ותצוגה מקדימה" subtitle="כך מפרסמים יראו את הפרופיל שלכם אחרי האימות.">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">חוזק הפרופיל</span>
            <span className="font-bold">{strength}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background" role="progressbar" aria-valuenow={strength} aria-valuemin={0} aria-valuemax={100} aria-label="חוזק הפרופיל">
            <div className="h-full rounded-full bg-brand" style={{ width: `${strength}%` }} />
          </div>
        </div>
        <PhotoUpload userId={me.userId} hasPhoto={Boolean(p.photo_path)} />
        {p.provider_type === "reservist" ? <DaysBandToggle checked={p.show_days_band} /> : null}
      </Card>

      <Card><ProviderProfile p={p} /></Card>

      {missing.length ? (
        <p role="status" className="rounded-xl bg-info px-4 py-3 text-sm">
          כדי לסיים חסר:{" "}
          {missing.map((m, i) => (
            <span key={m.href}>{i ? ", " : ""}<Link href={m.href} className="font-semibold underline">{m.label}</Link></span>
          ))}
        </p>
      ) : null}
      <FinishButton disabled={missing.length > 0} />
    </WizardShell>
  );
}
