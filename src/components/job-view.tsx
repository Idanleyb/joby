import Link from "next/link";
import type { ReactNode } from "react";
import { applicantRange, budgetText, placeText, timeAgo, TIMELINE_LABEL } from "@/lib/jobs";
import { cx } from "@/components/ui";

export type JobCardData = {
  id: string;
  title: string;
  description?: string;
  mode: string;
  city: string | null;
  budget_type: string;
  budget_min: number | null;
  budget_max: number | null;
  timeline: string;
  start_date?: string | null;
  skills?: string[];
  published_at: string;
  application_count: number;
  subName: string;
  poster?: PosterSignals | null;
  onBehalfName?: string | null;
};
export type PosterSignals = {
  display_name: string; poster_type: string; jobs_posted: number; jobs_closed: number; hires: number;
  rating_avg: number | null; rating_count: number; created_at?: string;
};

const POSTER_TYPE: Record<string, string> = { private: "אדם פרטי", business: "עסק", hr: "מגייס/ת", public_body: "גוף ציבורי" };

export function PosterTrust({ p, name }: { p?: PosterSignals | null; name?: string | null }) {
  if (!p) return name ? <p className="text-sm text-muted">פורסם עבור <bdi>{name}</bdi> על ידי צוות Joby</p> : null;
  const hireRate = p.jobs_closed > 0 ? Math.round((p.hires / p.jobs_closed) * 100) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      <span className="font-semibold text-foreground"><bdi>{p.display_name}</bdi></span>
      <span>{POSTER_TYPE[p.poster_type]}</span>
      <span>✓ טלפון מאומת</span>
      <span>{p.jobs_posted} עבודות פורסמו</span>
      {hireRate != null ? <span>{hireRate}% גיוס</span> : null}
      {p.rating_count >= 3 && p.rating_avg ? <span>★ {p.rating_avg} ({p.rating_count})</span> : null}
    </div>
  );
}

/** The cost of applying, with the short refund rule (PRD 5.10, 5.13). */
export function ApplyCostNote({ cost, className }: { cost: number; className?: string }) {
  return (
    <p className={cx("text-xs text-muted", className)}>
      💳 הגשת מועמדות: <b className="text-foreground">{cost} קרדיטים</b> · חוזרים אם העבודה נסגרת בלי גיוס או שהפנייה לא נפתחה 30 ימים ·{" "}
      <Link href="/how-it-works#credits" className="underline">חוקי הקרדיטים</Link>
    </p>
  );
}

export function JobCard({ job, action, applyCost }: { job: JobCardData; action?: ReactNode; applyCost?: number }) {
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/jobs/${job.id}`} className="text-lg font-bold leading-snug hover:underline">{job.title}</Link>
        <span className="shrink-0 text-xs text-muted">{timeAgo(job.published_at)}</span>
      </div>
      <p className="text-sm text-muted">{job.subName} · 📍 {placeText(job)}</p>
      <p className={cx("text-sm font-bold", job.budget_type === "open_to_quotes" && "font-semibold text-muted")}>{budgetText(job)}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PosterTrust p={job.poster} name={job.onBehalfName} />
        <span className="text-xs text-muted">{applicantRange(job.application_count)}</span>
      </div>
      {applyCost ? <ApplyCostNote cost={applyCost} className="border-t border-border pt-2" /> : null}
      {action}
    </article>
  );
}

export function JobDetails({ job }: { job: JobCardData }) {
  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-muted">{job.subName}</p>
        <h1 className="text-[26px] font-bold sm:text-3xl">{job.title}</h1>
        <PosterTrust p={job.poster} name={job.onBehalfName} />
      </header>
      <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-background p-4 text-sm">
        <div><dt className="text-muted">תקציב</dt><dd className="font-bold">{budgetText(job)}</dd></div>
        <div><dt className="text-muted">איפה</dt><dd className="font-semibold">{placeText(job)}</dd></div>
        <div><dt className="text-muted">מתי</dt><dd className="font-semibold">{TIMELINE_LABEL[job.timeline]}{job.start_date ? ` · מ-${job.start_date.split("-").reverse().join("/")}` : ""}</dd></div>
        <div><dt className="text-muted">מועמדים</dt><dd className="font-semibold">{applicantRange(job.application_count)}</dd></div>
      </dl>
      {job.description ? <p className="whitespace-pre-line leading-relaxed">{job.description}</p> : null}
      {job.skills?.length ? (
        <div className="flex flex-wrap gap-1.5">{job.skills.map((s) => <span key={s} className="rounded-lg bg-background px-2 py-1 text-sm">{s}</span>)}</div>
      ) : null}
    </article>
  );
}
