import { createClient } from "@/lib/supabase/server";
import { budgetText, placeText, timeAgo } from "@/lib/jobs";
import { ActionButton } from "@/components/action-button";
import { Card } from "@/components/ui";
import { releaseJob, removeJob } from "./actions";

const HOLD: Record<string, string> = { keyword: "מילה אסורה בטקסט", reports: "3 דיווחים ומעלה" };

export default async function AdminHeldJobs() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, description, hold_reason, mode, city, budget_type, budget_min, budget_max, published_at, poster:poster_profiles(display_name)")
    .eq("status", "held").order("published_at");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-extrabold">עבודות בבדיקה ({jobs?.length ?? 0})</h1>
      {!jobs?.length ? <p className="text-muted">התור ריק.</p> : null}
      {jobs?.map((j) => (
        <Card key={j.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold">{j.title}</h2>
            <span className="text-xs text-muted">{HOLD[j.hold_reason ?? ""] ?? j.hold_reason} · {timeAgo(j.published_at)}</span>
          </div>
          <p className="text-sm text-muted"><bdi>{j.poster?.display_name}</bdi> · {placeText(j)} · {budgetText(j)}</p>
          <p className="whitespace-pre-line text-sm">{j.description}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ActionButton variant="primary" action={releaseJob.bind(null, j.id)} label="אישור ופרסום" />
            <ActionButton action={removeJob.bind(null, j.id, "violates_terms")} label="הסרה" confirm="להסיר את העבודה? המפרסם יקבל הודעה." confirmLabel="הסרה" />
          </div>
        </Card>
      ))}
    </div>
  );
}
