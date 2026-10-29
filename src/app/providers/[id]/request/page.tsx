import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePoster } from "@/lib/poster";
import { PageShell } from "@/components/ui";
import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "פנייה ישירה · Joby" };

export default async function DirectRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const me = await requirePoster(`/providers/${id}/request`);
  if (me.userId === id) redirect(`/providers/${id}`);
  const supabase = await createClient();
  const [{ data: provider }, { data: subs }, { data: jobs }, { data: poster }, { data: open }] = await Promise.all([
    supabase.from("provider_profiles").select("display_name, verification_status").eq("user_id", id).maybeSingle(),
    supabase.from("provider_subcategories").select("subcategories(id, name_he, categories(budget_mandatory))").eq("provider_id", id),
    supabase.from("jobs").select("id, title").eq("poster_id", me.userId).eq("status", "open").order("published_at", { ascending: false }),
    supabase.from("poster_profiles").select("city").eq("user_id", me.userId).single(),
    supabase.from("direct_requests").select("id").eq("poster_id", me.userId).eq("provider_id", id).eq("status", "pending").maybeSingle(),
  ]);
  if (!provider || provider.verification_status !== "approved") notFound();
  const name = provider.display_name ?? "";

  if (open) {
    return (
      <PageShell title={`פנייה ל-${name}`}>
        <p className="rounded-2xl bg-background p-5 text-sm">כבר שלחת פנייה ל-<bdi>{name}</bdi> והיא ממתינה לתשובה. <Link prefetch={false} href="/poster/requests" className="underline">לפניות שלי</Link></p>
      </PageShell>
    );
  }
  const options = (subs ?? []).flatMap((s) => (s.subcategories ? [{ id: s.subcategories.id, name_he: s.subcategories.name_he, budget_mandatory: Boolean(s.subcategories.categories?.budget_mandatory) }] : []));
  return (
    <PageShell title={<>פנייה ישירה ל-<bdi>{name}</bdi></>} subtitle="תארו בקצרה מה צריך. אין צורך לפרסם עבודה.">
      <RequestForm providerId={id} providerName={name} subs={options} jobs={jobs ?? []} defaultCity={poster?.city ?? ""} />
    </PageShell>
  );
}
