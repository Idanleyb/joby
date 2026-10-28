import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProvider } from "@/lib/provider";
import { formatIlPhone } from "@/lib/phone";
import { APP_STATUS_LABEL, budgetText, timeAgo } from "@/lib/jobs";
import { PageShell, cx } from "@/components/ui";
import { Withdraw } from "./withdraw";
import { RequestActions } from "./request-actions";
import { PosterTrust } from "@/components/job-view";
import { REQUEST_STATUS, RequestBriefView } from "@/components/request-view";
import { daysLeft } from "@/lib/jobs";

export const metadata: Metadata = { title: "ההצעות שלי · Joby" };

const TABS = {
  active: { label: "פעילות", statuses: ["sent", "viewed", "shortlisted", "contacted"] },
  hired: { label: "נבחרתי", statuses: ["hired"] },
  closed: { label: "סגורות", statuses: ["not_selected", "credited_back", "withdrawn"] },
} as const;
type Tab = keyof typeof TABS | "requests";

const STATUS_CLS: Record<string, string> = {
  viewed: "bg-info text-foreground",
  shortlisted: "bg-action text-foreground",
  contacted: "bg-brand text-brand-contrast",
  hired: "bg-brand text-brand-contrast",
};

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { me } = await requireProvider();
  const sp = await searchParams;
  const tab: Tab = sp.tab === "hired" || sp.tab === "closed" || sp.tab === "requests" ? sp.tab : "active";
  const supabase = await createClient();
  const [{ data: requests }, { data: wallet }, { data: costRow }] = await Promise.all([
    supabase.from("direct_requests")
      .select("id, poster_id, title, description, mode, city, budget_type, budget_min, budget_max, timeline, status, decline_reason, sent_at, expires_at, poster:poster_profiles(display_name, poster_type, jobs_posted, jobs_closed, hires, rating_avg, rating_count)")
      .eq("provider_id", me.userId).order("sent_at", { ascending: false }).limit(50),
    supabase.from("provider_wallets").select("balance").eq("provider_id", me.userId).maybeSingle(),
    supabase.from("app_settings").select("value").eq("key", "request_cost").maybeSingle(),
  ]);
  const requestCost = Number(costRow?.value ?? 2);
  const pendingRequests = (requests ?? []).filter((r) => r.status === "pending" && new Date(r.expires_at) > new Date()).length;
  const { data: all } = await supabase
    .from("applications")
    .select("id, status, sent_at, viewed_at, proposed_price, job:jobs(id, title, status, poster_id, budget_type, budget_min, budget_max, poster:poster_profiles(display_name))")
    .eq("provider_id", me.userId)
    .order("sent_at", { ascending: false });
  const counts = Object.fromEntries((Object.keys(TABS) as (keyof typeof TABS)[]).map((t) => [t, (all ?? []).filter((a) => (TABS[t].statuses as readonly string[]).includes(a.status)).length]));
  const apps = tab === "requests" ? [] : (all ?? []).filter((a) => (TABS[tab].statuses as readonly string[]).includes(a.status));
  const requestContacts = new Map<string, { full_name: string; phone: string; email: string | null }>();
  if (tab === "requests") {
    await Promise.all((requests ?? []).filter((r) => r.status === "approved").map(async (r) => {
      const { data } = await supabase.rpc("get_contact", { p_other: r.poster_id }).maybeSingle();
      if (data) requestContacts.set(r.id, data);
    }));
  }

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
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((t) => (
          <Link key={t} href={t === "active" ? "/proposals" : `/proposals?tab=${t}`} aria-current={tab === t ? "page" : undefined}
            className={cx("flex-1 rounded-lg px-3 py-2 text-center", tab === t && "bg-surface shadow-sm")}>
            {TABS[t].label} ({counts[t]})
          </Link>
        ))}
        <Link href="/proposals?tab=requests" aria-current={tab === "requests" ? "page" : undefined}
          className={cx("relative flex-1 rounded-lg px-3 py-2 text-center", tab === "requests" && "bg-surface shadow-sm")}>
          פניות{pendingRequests ? <span className="ms-1 rounded-full bg-danger px-1.5 text-[11px] text-white">{pendingRequests}</span> : null}
        </Link>
      </nav>
      {tab === "requests" ? (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-muted">מפרסמים שפנו אליך ישירות. אישור עולה {requestCost} קרדיטים וחושף את פרטי הקשר של שניכם; דחייה חינם. פנייה פגה אחרי 7 ימים.</p>
          {!requests?.length ? <p className="rounded-2xl bg-background p-6 text-center text-muted">עוד לא קיבלת פניות ישירות.</p> : null}
          <ul className="flex flex-col gap-3">
            {requests?.map((r) => {
              const live = r.status === "pending" && new Date(r.expires_at) > new Date();
              const c = requestContacts.get(r.id);
              return (
                <li key={r.id} className={cx("flex flex-col gap-3 rounded-2xl border bg-surface p-4", live ? "border-foreground" : "border-border")}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold leading-snug">{r.title}</h3>
                    <span className="shrink-0 text-xs font-semibold text-muted">{live ? `עוד ${daysLeft(r.expires_at)} ימים` : REQUEST_STATUS[r.status === "pending" ? "expired" : r.status]}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Link href={`/posters/${r.poster_id}`} className="underline">לפרופיל המפרסם</Link>
                    <PosterTrust p={r.poster} />
                  </div>
                  <RequestBriefView r={r} />
                  {live ? <RequestActions requestId={r.id} cost={requestCost} balance={wallet?.balance ?? 0} /> : null}
                  {c ? (
                    <p className="rounded-xl bg-background p-3 text-sm">
                      <bdi>{c.full_name}</bdi> · <a href={`tel:${c.phone}`} dir="ltr" className="underline">{formatIlPhone(c.phone)}</a> ·{" "}
                      <a href={`https://wa.me/${c.phone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      {tab !== "requests" && !apps.length ? <p className="rounded-2xl bg-background p-6 text-center text-muted">{tab === "active" ? "אין הצעות פעילות." : "אין כאן עדיין."}</p> : null}
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
