import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProvider } from "@/lib/provider";
import { formatIlPhone } from "@/lib/phone";
import { APP_STATUS_LABEL, budgetText, timeAgo } from "@/lib/jobs";
import { PageShell, cx } from "@/components/ui";
import { Withdraw } from "./withdraw";

export const metadata: Metadata = { title: "ההצעות שלי · Joby" };

const TABS = {
  active: { label: "פעילות", statuses: ["sent", "viewed", "shortlisted", "contacted"] },
  hired: { label: "נבחרתי", statuses: ["hired"] },
  closed: { label: "סגורות", statuses: ["not_selected", "credited_back", "withdrawn"] },
} as const;
type Tab = keyof typeof TABS;

const STATUS_CLS: Record<string, string> = {
  viewed: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  shortlisted: "bg-accent/20 text-accent-strong",
  contacted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  hired: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { me } = await requireProvider();
  const sp = await searchParams;
  const tab: Tab = sp.tab === "hired" || sp.tab === "closed" ? sp.tab : "active";
  const supabase = await createClient();
  const { data: all } = await supabase
    .from("applications")
    .select("id, status, sent_at, viewed_at, proposed_price, job:jobs(id, title, status, poster_id, budget_type, budget_min, budget_max, poster:poster_profiles(display_name))")
    .eq("provider_id", me.userId)
    .order("sent_at", { ascending: false });
  const counts = Object.fromEntries((Object.keys(TABS) as Tab[]).map((t) => [t, (all ?? []).filter((a) => (TABS[t].statuses as readonly string[]).includes(a.status)).length]));
  const apps = (all ?? []).filter((a) => (TABS[tab].statuses as readonly string[]).includes(a.status));

  const contacts = new Map<string, { full_name: string; phone: string; email: string | null }>();
  await Promise.all(
    apps.filter((a) => (a.status === "contacted" || a.status === "hired") && a.job?.poster_id).map(async (a) => {
      const { data } = await supabase.rpc("get_contact", { p_other: a.job!.poster_id! }).maybeSingle();
      if (data) contacts.set(a.id, data);
    }),
  );

  return (
    <PageShell title="ההצעות שלי" subtitle={<Link href="/jobs" className="underline underline-offset-4">למציאת עבודות</Link>}>
      <nav className="flex gap-1 rounded-xl bg-background p-1 text-sm font-semibold" aria-label="סינון">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <Link key={t} href={t === "active" ? "/proposals" : `/proposals?tab=${t}`} aria-current={tab === t ? "page" : undefined}
            className={cx("flex-1 rounded-lg px-3 py-2 text-center", tab === t && "bg-surface shadow-sm")}>
            {TABS[t].label} ({counts[t]})
          </Link>
        ))}
      </nav>
      {!apps.length ? <p className="rounded-2xl bg-background p-6 text-center text-muted">{tab === "active" ? "אין הצעות פעילות." : "אין כאן עדיין."}</p> : null}
      <ul className="flex flex-col gap-3">
        {apps.map((a) => {
          const c = contacts.get(a.id);
          return (
            <li key={a.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/jobs/${a.job?.id}`} className="font-bold leading-snug hover:underline">{a.job?.title}</Link>
                <span className={cx("shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold", STATUS_CLS[a.status] ?? "bg-background text-muted")}>{APP_STATUS_LABEL[a.status]}</span>
              </div>
              <p className="text-sm text-muted">
                {a.job?.poster ? <>אצל <Link href={`/posters/${a.job.poster_id}`} className="underline"><bdi>{a.job.poster.display_name}</bdi></Link> · </> : null}
                {a.job ? budgetText(a.job) : ""}{a.proposed_price ? ` · ההצעה שלי ₪${a.proposed_price.toLocaleString("he-IL")}` : ""} · נשלחה {timeAgo(a.sent_at)}
                {a.viewed_at ? " · נצפתה ✓" : ""}
              </p>
              {c ? (
                <p className="rounded-xl bg-background p-3 text-sm">
                  <bdi>{c.full_name}</bdi> · <a href={`tel:${c.phone}`} dir="ltr" className="underline">{formatIlPhone(c.phone)}</a> ·{" "}
                  <a href={`https://wa.me/${c.phone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>
                </p>
              ) : null}
              {tab === "active" ? <Withdraw appId={a.id} /> : null}
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
