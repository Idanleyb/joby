import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProvider, stepPath } from "@/lib/provider";
import { WizardShell } from "@/components/wizard-shell";
import { ServicesForm } from "./services-form";

export const metadata: Metadata = { title: "שירותים · Joby" };

export default async function ServicesPage() {
  const { me, provider: p } = await requireProvider();
  const supabase = await createClient();
  const [{ data: cards }, { data: mine }] = await Promise.all([
    supabase.from("service_cards").select("id, title, price_from, unit, mode, description, subcategories(name_he)").eq("provider_id", me.userId).order("created_at"),
    supabase.from("provider_subcategories").select("subcategories(id, name_he)").eq("provider_id", me.userId),
  ]);
  const subs = (mine ?? []).map((m) => m.subcategories).filter((s): s is { id: number; name_he: string } => Boolean(s));

  return (
    <WizardShell current="services" reached={p.onboarding_step} title="השירותים שלכם" subtitle="עד 3 שירותים עם מחיר התחלתי. כך מפרסמים מבינים מהר מה אתם מציעים. לא חובה.">
      {subs.length ? (
        <ServicesForm
          cards={(cards ?? []).map((c) => ({ ...c, sub: c.subcategories?.name_he ?? "" }))}
          subs={subs}
          defaultMode={p.works_onsite && p.works_remote ? "both" : p.works_remote ? "remote" : "onsite"}
        />
      ) : (
        <p className="text-muted">
          קודם צריך לבחור תחומים. <Link className="font-semibold underline" href={stepPath("categories")}>לבחירת תחומים</Link>
        </p>
      )}
    </WizardShell>
  );
}
