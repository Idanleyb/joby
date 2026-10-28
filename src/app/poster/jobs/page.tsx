import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requirePoster } from "@/lib/poster";
import { daysLeft, JOB_STATUS_LABEL, timeAgo } from "@/lib/jobs";
import { PageShell, cx } from "@/components/ui";

export const metadata: Metadata = { title: "העבודות שלי · Joby" };

const STATUS_CLS: Record<string, string> = {
  open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  held: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  hired: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
};

export default async function PosterJobsPage() {
  const me = await requirePoster("/poster/jobs");
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, published_at, expires_at, application_count, applications(viewed_at, status)")
    .eq("poster_id", me.userId)
    .order("published_at", { ascending: false });

  return (
    <PageShell title="העבודות שלי" subtitle={<><Link href="/jobs/new" className="font-semibold text-foreground underline underline-offset-4">+ פרסום עבודה חדשה</Link> · <Link href="/poster/requests" className="underline underline-offset-4">פניות ישירות שנשלחו</Link></>}>
      {!jobs?.length ? <p className="text-muted">עוד לא פורסמו עבודות.</p> : null}
      <ul className="flex flex-col gap-3">
        {jobs?.map((j) => {
          const unseen = j.applications.filter((a) => !a.viewed_at && a.status !== "withdrawn").length;
          return (
            <li key={j.id}>
              <Link href={`/poster/jobs/${j.id}`} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 hover:bg-background">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-bold leading-snug">{j.title}</span>
                  <span className={cx("shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold", STATUS_CLS[j.status] ?? "bg-background text-muted")}>{JOB_STATUS_LABEL[j.status]}</span>
                </div>
                <p className="text-sm text-muted">
                  {j.application_count} מועמדים{unseen ? <b className="text-foreground"> · {unseen} חדשים</b> : null} · פורסם {timeAgo(j.published_at)}
                  {j.status === "open" ? ` · נשארו ${daysLeft(j.expires_at)} ימים` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
