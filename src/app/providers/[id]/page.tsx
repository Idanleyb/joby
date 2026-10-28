import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadProviderView } from "@/lib/provider-view";
import { ProviderProfile } from "@/components/provider-profile";
import Link from "next/link";
import { Card } from "@/components/ui";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = /^[0-9a-f-]{36}$/.test(id) ? await loadProviderView(id) : null;
  return { title: p ? `${p.display_name} · Joby` : "Joby" };
}

export default async function ProviderPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = await loadProviderView(id);
  if (!p) notFound();

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const viewer = (claims?.claims?.sub as string | undefined) ?? null;

  // Flow B: "Send a request" for anyone but the provider themself (PRD 5.11).
  let cta: React.ReactNode = null;
  if (p.verification_status === "approved" && viewer !== id) {
    const btn = "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-contrast";
    if (!viewer) cta = <Link href={`/login?next=/providers/${id}/request`} className={btn}>שליחת פנייה ישירה</Link>;
    else {
      const [{ data: poster }, { data: pending }] = await Promise.all([
        supabase.from("poster_profiles").select("user_id, is_demo").eq("user_id", viewer).maybeSingle(),
        supabase.from("direct_requests").select("id").eq("poster_id", viewer).eq("provider_id", id).eq("status", "pending").maybeSingle(),
      ]);
      cta = poster && poster.is_demo !== p.is_demo ? (
        <p className="rounded-xl bg-background p-3 text-center text-sm">{p.is_demo ? "זה פרופיל דמו להמחשה — אי אפשר לשלוח אליו פנייה מחשבון אמיתי." : "חשבון דמו לא יכול לפנות לנותני שירות אמיתיים."}</p>
      ) : pending ? (
        <p className="rounded-xl bg-background p-3 text-center text-sm">שלחת פנייה והיא ממתינה לתשובה · <Link href="/poster/requests" className="underline">לפניות שלי</Link></p>
      ) : poster ? (
        <Link href={`/providers/${id}/request`} className={btn}>שליחת פנייה ישירה</Link>
      ) : (
        <Link href="/onboarding/poster" className={btn}>כדי לפנות, השלימו פרטי מפרסם</Link>
      );
    }
  }

  // CV: signed-in viewers only, when the provider allows it (storage policy enforces the same).
  let cvHref: string | null = null;
  if (p.cv_path && p.cv_visible) {
    if (viewer) {
      const { data } = await supabase.storage.from("cvs").createSignedUrl(p.cv_path, 300);
      cvHref = data?.signedUrl ?? null;
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <Card><ProviderProfile p={p} cvHref={cvHref} actions={cta} /></Card>
    </main>
  );
}
