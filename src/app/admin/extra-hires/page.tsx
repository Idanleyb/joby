import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/jobs";
import { ActionButton } from "@/components/action-button";
import { Card } from "@/components/ui";
import { decideExtraHire } from "../jobs/actions";

export default async function AdminExtraHires() {
  const supabase = await createClient();
  const { data: reqs } = await supabase
    .from("extra_hire_requests")
    .select("id, created_at, job:jobs(id, title, poster:poster_profiles(display_name)), application:applications(provider_id, provider:provider_profiles(display_name))")
    .eq("status", "open").order("created_at");

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[26px] font-bold">בקשות לגיוס נוסף ({reqs?.length ?? 0})</h1>
      <p className="text-sm text-muted">מפרסם שכבר בחר נותן שירות מבקש לגייס עוד אחד. אישור יוצר התקשרות נוספת; שני הצדדים מקבלים הודעה בכל מקרה.</p>
      {!reqs?.length ? <p className="text-muted">אין בקשות פתוחות.</p> : null}
      {reqs?.map((r) => (
        <Card key={r.id} className="flex flex-col gap-3">
          <p className="font-bold">{r.job?.title}</p>
          <p className="text-sm text-muted">
            מפרסם: <bdi>{r.job?.poster?.display_name}</bdi> · מבקש לגייס גם את{" "}
            <Link prefetch={false} href={`/providers/${r.application?.provider_id}`} className="underline"><bdi>{r.application?.provider?.display_name}</bdi></Link> · {timeAgo(r.created_at)}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <ActionButton variant="primary" action={decideExtraHire.bind(null, r.id, true)} label="אישור" />
            <ActionButton action={decideExtraHire.bind(null, r.id, false)} label="דחייה" confirm="לדחות את הבקשה?" confirmLabel="דחייה" />
          </div>
        </Card>
      ))}
    </div>
  );
}
