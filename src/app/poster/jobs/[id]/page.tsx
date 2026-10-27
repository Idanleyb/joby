import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requirePoster } from "@/lib/poster";
import { APP_STATUS_LABEL, budgetText, daysLeft, JOB_STATUS_LABEL, timeAgo } from "@/lib/jobs";
import { ActionButton } from "@/components/action-button";
import { Card, PageShell, cx } from "@/components/ui";
import { closeJob, extendJob } from "../actions";

export const metadata: Metadata = { title: "מועמדים · Joby" };

const POSTER_LABEL: Record<string, string> = { ...APP_STATUS_LABEL, hired: "נבחר/ה", not_selected: "לא נבחר/ה", contacted: "יצרת קשר" };

export default async function PosterJobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const { id } = await params;
  const { posted } = await searchParams;
  const me = await requirePoster(`/poster/jobs/${id}`);
  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("id, title, status, hold_reason, expires_at, extended, application_count, budget_type, budget_min, budget_max, published_at")
    .eq("id", id).eq("poster_id", me.userId).maybeSingle();
  if (!job) notFound();

  const [{ data: apps }, { data: extras }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, pitch, proposed_price, sent_at, viewed_at, provider:provider_profiles(user_id, display_name, headline, rating_avg, rating_count, jobs_done)")
      .eq("job_id", id).neq("status", "withdrawn").order("sent_at"),
    supabase.from("extra_hire_requests").select("application_id, status").eq("job_id", id),
  ]);
  const order = { hired: 0, shortlisted: 1, contacted: 2, viewed: 3, sent: 3, not_selected: 5, credited_back: 6 } as Record<string, number>;
  const sorted = [...(apps ?? [])].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
  const extraOf = new Map((extras ?? []).map((e) => [e.application_id, e.status]));
  const live = job.status === "open" || job.status === "held";

  return (
    <PageShell title={job.title} subtitle={<>{JOB_STATUS_LABEL[job.status]} · {budgetText(job)} · <Link href={`/jobs/${job.id}`} className="underline underline-offset-4">צפייה במודעה</Link></>}>
      {posted && job.status === "open" ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/30">העבודה פורסמה ✓ נודיע לך כשיגיעו מועמדים.</p> : null}
      {job.status === "held" ? (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm dark:bg-amber-950/30">העבודה ממתינה לבדיקה קצרה של הצוות לפני שתוצג לנותני שירות. בדרך כלל זה לוקח עד יום עבודה.</p>
      ) : null}

      {live ? (
        <Card className="flex flex-col gap-3">
          {job.status === "open" ? (
            <p className="text-sm">נשארו <b>{daysLeft(job.expires_at)}</b> ימים עד שהמודעה תיסגר{job.extended ? " (כבר הוארכה)" : ""}.</p>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            {job.status === "open" && !job.extended ? (
              <ActionButton action={extendJob.bind(null, job.id)} label="הארכה ב-30 ימים" confirm="להאריך את המודעה ב-30 ימים נוספים? אפשר להאריך פעם אחת בלבד." confirmLabel="הארכה" />
            ) : null}
            <ActionButton action={closeJob.bind(null, job.id)} label="סגירה בלי גיוס" variant="ghost"
              confirm="לסגור את העבודה? המודעה תוסר, וכל המועמדים יקבלו בחזרה את הקרדיטים." confirmLabel="סגירה" />
          </div>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">מועמדים ({sorted.length})</h2>
        {!sorted.length ? <p className="text-sm text-muted">עוד אין מועמדים. נותני שירות שמתאימים לתחום ולאזור רואים את העבודה בפיד שלהם.</p> : null}
        <ul className="flex flex-col gap-3">
          {sorted.map((a) => (
            <li key={a.id}>
              <Link href={`/poster/jobs/${job.id}/applications/${a.id}`} className={cx("flex flex-col gap-1.5 rounded-2xl border bg-surface p-4 hover:bg-background", a.viewed_at ? "border-border" : "border-accent")}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold"><bdi>{a.provider?.display_name}</bdi>{!a.viewed_at ? <span className="ms-2 rounded bg-accent/20 px-1.5 text-xs">חדש</span> : null}</span>
                  <span className="shrink-0 text-xs text-muted">{POSTER_LABEL[a.status]}{extraOf.get(a.id) === "open" ? " · בקשה לגיוס נוסף" : ""}</span>
                </div>
                {a.provider?.headline ? <p className="text-sm text-muted">{a.provider.headline}</p> : null}
                <p className="line-clamp-2 text-sm">{a.pitch}</p>
                <p className="text-xs text-muted">
                  {a.proposed_price ? `הצעה: ₪${a.proposed_price.toLocaleString("he-IL")} · ` : ""}
                  {a.provider && a.provider.rating_count >= 3 && a.provider.rating_avg ? `★ ${a.provider.rating_avg} · ` : ""}
                  {timeAgo(a.sent_at)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
