import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProvider } from "@/lib/provider";
import { WizardShell } from "@/components/wizard-shell";
import { CategoriesForm } from "./categories-form";

export const metadata: Metadata = { title: "תחומים · Joby" };

export default async function CategoriesPage() {
  const { me, provider } = await requireProvider();
  const supabase = await createClient();
  const [{ data: cats }, { data: subs }, { data: mine }, { data: skills }] = await Promise.all([
    supabase.from("categories").select("id, name_he").eq("active", true).order("sort_order"),
    supabase.from("subcategories").select("id, category_id, name_he, licensed, is_other").eq("active", true).order("sort_order"),
    supabase.from("provider_subcategories").select("subcategory_id").eq("provider_id", me.userId),
    supabase.from("provider_skills").select("skill").eq("provider_id", me.userId),
  ]);
  const grouped = (cats ?? []).map((c) => ({ ...c, subs: (subs ?? []).filter((s) => s.category_id === c.id) }));

  return (
    <WizardShell current="categories" reached={provider.onboarding_step} title="במה אתם עובדים?" subtitle="התחומים קובעים לאילו עבודות תקבלו התראות.">
      <CategoriesForm
        cats={grouped}
        initial={{
          subs: (mine ?? []).map((m) => m.subcategory_id),
          skills: (skills ?? []).map((s) => s.skill).join(", "),
          license: provider.license_number ?? "",
          otherTitle: provider.other_title ?? "",
        }}
      />
    </WizardShell>
  );
}
