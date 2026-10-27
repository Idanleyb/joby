import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, nextStep, type Me } from "@/lib/onboarding";
import type { Database } from "@/lib/database.types";

export type ProviderRow = Database["public"]["Tables"]["provider_profiles"]["Row"];

export const WIZARD_STEPS = [
  { n: 1, slug: "proof", title: "אימות שירות" },
  { n: 2, slug: "cv", title: "קורות חיים" },
  { n: 3, slug: "categories", title: "תחומים" },
  { n: 4, slug: "area", title: "אזור עבודה" },
  { n: 5, slug: "about", title: "קצת עליך" },
  { n: 6, slug: "services", title: "שירותים" },
  { n: 7, slug: "photo", title: "תמונה וסיום" },
] as const;
export type WizardSlug = (typeof WIZARD_STEPS)[number]["slug"];
export const COMPLETED_STEP = 8;

export const stepPath = (slug: WizardSlug) => `/provider/onboarding/${slug}`;

/** Signed-in, onboarded user who has a provider profile — or redirect to where they belong. */
export async function requireProvider(): Promise<{ me: Me; provider: ProviderRow }> {
  const me = await getMe();
  const step = nextStep(me);
  if (!me || (step !== "/account" && step !== "/onboarding/poster")) redirect(step);
  const supabase = await createClient();
  const { data: provider } = await supabase.from("provider_profiles").select("*").eq("user_id", me.userId).maybeSingle();
  if (!provider) redirect("/account");
  return { me, provider };
}

/** Latest verification request of the current user (any status). */
export async function latestVerification(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verification_requests")
    .select("id, kind, status, decision_reason, submitted_at, days_band")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

/** PRD 5.2 profile-strength weights. */
export function profileStrength(p: {
  verification: string; headline: string | null; bio: string | null; subcategories: number; skills: number;
  photo: boolean; cv: boolean; services: number; portfolio: number;
}) {
  let s = 0;
  if (p.verification === "approved") s += 25;
  else if (p.verification === "pending") s += 15;
  if (p.headline && p.bio) s += 20;
  if (p.subcategories > 0 && p.skills > 0) s += 15;
  else if (p.subcategories > 0) s += 10;
  if (p.photo) s += 10;
  if (p.cv) s += 10;
  if (p.services > 0) s += 10;
  if (p.portfolio > 0) s += 10;
  return s;
}

export const REJECTION_REASONS: Record<string, string> = {
  unreadable: "הקבצים לא קריאים",
  name_mismatch: "השם במסמך לא תואם לשם בחשבון",
  under_30_days: "פחות מ-30 ימי מילואים מאז 7 באוקטובר 2023",
  not_3010: "המסמך אינו אישור שירות מילואים (3010)",
  suspected_tampering: "חשד לשינוי במסמך",
  not_marriage_proof: "המסמך אינו מוכיח זוגיות",
};
export const reasonText = (r: string | null | undefined) => (r ? REJECTION_REASONS[r] ?? r : "");
