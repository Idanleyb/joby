import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePoster } from "@/lib/poster";
import { formatIlPhone } from "@/lib/phone";
import { daysLeft, timeAgo } from "@/lib/jobs";
import { REQUEST_STATUS, RequestBriefView } from "@/components/request-view";
import { PageShell, cx } from "@/components/ui";

export const metadata: Metadata = { title: "פניות שנשלחו · Joby" };

const STATUS_CLS: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  pending: "bg-accent/20 text-accent-strong",
};

export default async function SentRequestsPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const me = await requirePoster("/poster/requests");
  const { sent } = await searchParams;
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("direct_requests")
    .select("id, provider_id, title, description, mode, city, budget_type, budget_min, budget_max, timeline, status, decline_reason, sent_at, expires_at, provider:provider_profiles(display_name, headline)")
    .eq("poster_id", me.userId).order("sent_at", { ascending: false }).limit(100);

  const contacts = new Map<string, { full_name: string; phone: string; email: string | null }>();
  await Promise.all((requests ?? []).filter((r) => r.status === "approved").map(async (r) => {
    const { data } = await supabase.rpc("get_contact", { p_other: r.provider_id }).maybeSingle();
    if (data) contacts.set(r.id, data);
  }));

  return (
    <PageShell title="פניות ישירות שנשלחו" subtitle={<><Link href="/providers" className="underline underline-offset-4">לחיפוש נותני שירות</Link> · <Link href="/poster/jobs" className="underline underline-offset-4">העבודות שלי</Link></>}>
      {sent ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/30">הפנייה נשלחה ✓ נעדכן אותך כשתגיע תשובה (עד 7 ימים).</p> : null}
      {!requests?.length ? <p className="rounded-2xl bg-background p-6 text-center text-muted">עוד לא שלחת פניות. אפשר לפנות לנותן שירות מהפרופיל שלו.</p> : null}
      <ul className="flex flex-col gap-3">
        {requests?.map((r) => {
          const status = r.status === "pending" && new Date(r.expires_at) <= new Date() ? "expired" : r.status;
          const c = contacts.get(r.id);
          return (
            <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <h3 className="font-bold leading-snug">{r.title}</h3>
                  <span className="text-sm text-muted">אל <Link href={`/providers/${r.provider_id}`} className="underline"><bdi>{r.provider?.display_name}</bdi></Link> · {timeAgo(r.sent_at)}</span>
                </div>
                <span className={cx("shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold", STATUS_CLS[status] ?? "bg-background text-muted")}>
                  {REQUEST_STATUS[status]}{status === "pending" ? ` · ${daysLeft(r.expires_at)} ימים` : ""}
                </span>
              </div>
              <RequestBriefView r={r} />
              {status === "declined" && r.decline_reason ? <p className="text-sm text-muted">סיבה: {r.decline_reason}</p> : null}
              {c ? (
                <div className="flex flex-col gap-2 rounded-xl bg-background p-3 text-sm">
                  <span><bdi>{c.full_name}</bdi> · <span dir="ltr">{formatIlPhone(c.phone)}</span>{c.email ? <> · <span dir="ltr">{c.email}</span></> : null}</span>
                  <div className="flex gap-3">
                    <a href={`tel:${c.phone}`} className="font-semibold underline">📞 התקשרות</a>
                    <a href={`https://wa.me/${c.phone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">WhatsApp</a>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
