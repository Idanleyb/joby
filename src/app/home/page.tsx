import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, nextStep } from "@/lib/onboarding";
import { getMode } from "@/lib/mode";
import { loadProviderView } from "@/lib/provider-view";
import { strengthWithTips } from "@/lib/strength";
import { daysLeft } from "@/lib/jobs";
import { loadFeedbackDue, type FeedbackItem } from "@/lib/feedback";
import { JobCard } from "@/components/job-view";
import { ProviderCard, loadProviderCards } from "@/components/provider-card";
import { Card, cx } from "@/components/ui";

export const metadata: Metadata = { title: "בית · Joby" };

const btn = "inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold";

function FeedbackDue({ items }: { items: FeedbackItem[] }) {
  if (!items.length) return null;
  return (
    <Card className="flex flex-col gap-2 border-foreground">
      <h2 className="font-bold">משוב על עבודות ({items.length})</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {items.slice(0, 3).map((i) => (
          <li key={i.engagementId}><Link prefetch={false} href={`/feedback/${i.engagementId}`} className="underline underline-offset-4">{i.title}</Link> <span className="text-muted">· <bdi>{i.otherName}</bdi></span></li>
        ))}
      </ul>
      {items.length > 3 ? <Link prefetch={false} href="/feedback" className="text-sm underline">לכל המשובים</Link> : null}
    </Card>
  );
}

function Tile({ href, value, label, warn }: { href: string; value: React.ReactNode; label: string; warn?: boolean }) {
  return (
    <Link prefetch={false} href={href} className={cx("flex flex-col gap-0.5 rounded-2xl border bg-surface p-4 hover:bg-background", warn ? "border-foreground" : "border-border")}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-sm text-muted">{label}</span>
    </Link>
  );
}

export default async function HomePage() {
  const me = await getMe();
  if (!me) redirect("/login");
  const step = nextStep(me);
  if (step !== "/account") redirect(step);
  const mode = await getMode(me);
  const supabase = await createClient();
  const first = me.fullName?.split(" ")[0] ?? "";
  const [{ count: unread }, feedbackDue] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", me.userId).eq("in_app", true).is("read_at", null),
    loadFeedbackDue(me.userId),
  ]);

  if (mode === "work") {
    const p = await loadProviderView(me.userId);
    if (!p) redirect("/account");
    const approved = p.verification_status === "approved";
    const [{ data: wallet }, { data: matchIds }, { data: apps }, { count: pendingRequests }, { data: costRow }] = await Promise.all([
      supabase.from("provider_wallets").select("balance").eq("provider_id", me.userId).maybeSingle(),
      supabase.rpc("my_matching_jobs"),
      supabase.from("applications").select("status").eq("provider_id", me.userId),
      supabase.from("direct_requests").select("id", { count: "exact", head: true }).eq("provider_id", me.userId).eq("status", "pending").gt("expires_at", new Date().toISOString()),
      supabase.from("app_settings").select("value").eq("key", "apply_cost").maybeSingle(),
    ]);
    const ids = (matchIds ?? []) as string[];
    const { data: latest } = ids.length
      ? await supabase.from("jobs")
          .select("id, is_demo, title, mode, city, budget_type, budget_min, budget_max, timeline, published_at, application_count, sub:subcategories(name_he), poster:poster_profiles(display_name, poster_type, jobs_posted, jobs_closed, hires, rating_avg, rating_count)")
          .in("id", ids.slice(0, 50)).order("published_at", { ascending: false }).limit(3)
      : { data: [] };
    const active = (apps ?? []).filter((a) => ["sent", "viewed", "shortlisted", "contacted"].includes(a.status)).length;
    const hot = (apps ?? []).filter((a) => ["shortlisted", "contacted"].includes(a.status)).length;
    const { value, tips } = strengthWithTips(p);

    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
        <h1 className="text-[26px] font-bold sm:text-3xl">שלום{first ? `, ${first}` : ""}</h1>
        {!approved ? (
          <Card className="flex flex-col gap-2 border-foreground">
            <p className="font-semibold">{p.verification_status === "pending" ? "האימות בבדיקה — בדרך כלל עד 24 שעות." : "כדי להגיש מועמדות צריך להשלים את אימות השירות."}</p>
            {p.verification_status !== "pending" ? <Link prefetch={false} href="/provider/onboarding/proof" className={`${btn} bg-brand text-brand-contrast`}>להשלמת האימות</Link> : null}
          </Card>
        ) : null}
        <FeedbackDue items={feedbackDue.filter((i) => !i.iAmPoster)} />
        {pendingRequests ? (
          <Link prefetch={false} href="/proposals?tab=requests" className="flex items-center justify-between gap-3 rounded-2xl border border-action-border bg-action p-4 font-semibold">
            <span>📨 {pendingRequests === 1 ? "פנייה ישירה אחת ממתינה לתשובה" : `${pendingRequests} פניות ישירות ממתינות לתשובה`}</span>
            <span aria-hidden="true">←</span>
          </Link>
        ) : null}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile href="/jobs" value={ids.length} label="עבודות מתאימות" />
          <Tile href="/proposals" value={active} label={hot ? `הצעות פעילות · ${hot} חמות` : "הצעות פעילות"} warn={hot > 0} />
          <Tile href="/provider/credits" value={wallet?.balance ?? 0} label="קרדיטים" />
          <Tile href="/notifications" value={unread ?? 0} label="התראות חדשות" warn={(unread ?? 0) > 0} />
        </div>
        {value < 100 ? (
          <Card className="flex flex-col gap-2">
            <div className="flex items-center justify-between"><h2 className="font-bold">חוזק הפרופיל</h2><span className="font-bold">{value}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} /></div>
            {tips[0] ? <Link prefetch={false} href={tips[0].href} className="text-sm underline underline-offset-4">הוספת {tips[0].label} (+{tips[0].gain}%)</Link> : null}
          </Card>
        ) : null}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">עבודות חדשות בשבילך</h2><Link prefetch={false} href="/jobs" className="text-sm underline">לכולן</Link></div>
          {latest?.length ? latest.map((j) => <JobCard key={j.id} job={{ ...j, subName: j.sub?.name_he ?? "" }} applyCost={Number(costRow?.value ?? 10)} />)
            : <p className="rounded-2xl bg-background p-5 text-sm text-muted">אין כרגע עבודות פתוחות בתחומים ובאזור שלך. נשלח התראה כשתתפרסם אחת.</p>}
        </section>
      </main>
    );
  }

  const { data: poster } = await supabase.from("poster_profiles").select("city").eq("user_id", me.userId).single();
  const { data: jobs } = await supabase
    .from("jobs").select("id, title, status, expires_at, subcategory_id, sub:subcategories(category_id), applications(viewed_at, status)")
    .eq("poster_id", me.userId).order("published_at", { ascending: false }).limit(20);
  const open = (jobs ?? []).filter((j) => j.status === "open" || j.status === "held");
  const newApps = open.reduce((n, j) => n + j.applications.filter((a) => !a.viewed_at && a.status !== "withdrawn").length, 0);
  const category = jobs?.[0]?.sub?.category_id ?? null;
  const { data: suggested } = await supabase.rpc("search_providers", { p_category: category ?? undefined, p_city: poster?.city, p_radius: 50, p_sort: "rating", p_limit: 3 });
  const cards = await loadProviderCards(suggested ?? []);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
      <h1 className="text-[26px] font-bold sm:text-3xl">שלום{first ? `, ${first}` : ""}</h1>
      <FeedbackDue items={feedbackDue.filter((i) => i.iAmPoster)} />
      <Link prefetch={false} href="/jobs/new" className={`${btn} bg-brand text-brand-contrast`}>+ פרסום עבודה חדשה</Link>
      <p className="-mt-2 text-center text-sm text-muted">או <Link prefetch={false} href="/providers" className="underline">פנייה ישירה לנותן שירות</Link> · <Link prefetch={false} href="/poster/requests" className="underline">הפניות ששלחתי</Link></p>
      <div className="grid grid-cols-3 gap-3">
        <Tile href="/poster/jobs" value={open.length} label="עבודות פתוחות" />
        <Tile href="/poster/jobs" value={newApps} label="מועמדים חדשים" warn={newApps > 0} />
        <Tile href="/notifications" value={unread ?? 0} label="התראות חדשות" warn={(unread ?? 0) > 0} />
      </div>
      {open.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">העבודות הפתוחות שלי</h2>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
            {open.map((j) => {
              const fresh = j.applications.filter((a) => !a.viewed_at && a.status !== "withdrawn").length;
              return (
                <li key={j.id}>
                  <Link prefetch={false} href={`/poster/jobs/${j.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-background">
                    <span className="font-semibold">{j.title}</span>
                    <span className="shrink-0 text-xs text-muted">{fresh ? <b className="text-foreground">{fresh} חדשים · </b> : null}{j.status === "open" ? `${daysLeft(j.expires_at)} ימים` : "בבדיקה"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">נותני שירות באזור שלך</h2><Link prefetch={false} href="/providers" className="text-sm underline">חיפוש</Link></div>
        {cards.length ? cards.map((c) => <ProviderCard key={c.user_id} p={c} />) : <p className="rounded-2xl bg-background p-5 text-sm text-muted">עוד אין נותני שירות מאומתים קרובים. <Link prefetch={false} href="/providers" className="underline">לחיפוש בכל הארץ</Link></p>}
      </section>
    </main>
  );
}
