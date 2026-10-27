import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProvider } from "@/lib/provider";
import { formatIlPhone } from "@/lib/phone";
import { APP_STATUS_LABEL, timeAgo } from "@/lib/jobs";
import { PageShell } from "@/components/ui";
import { Withdraw } from "./withdraw";

export const metadata: Metadata = { title: "המועמדויות שלי · Joby" };

export default async function MyApplicationsPage() {
  const { me } = await requireProvider();
  const supabase = await createClient();
  const { data: apps } = await supabase
    .from("applications")
    .select("id, status, sent_at, viewed_at, job:jobs(id, title, status, poster_id)")
    .eq("provider_id", me.userId)
    .order("sent_at", { ascending: false });

  const contacts = new Map<string, { full_name: string; phone: string; email: string | null }>();
  await Promise.all(
    (apps ?? []).filter((a) => (a.status === "contacted" || a.status === "hired") && a.job?.poster_id).map(async (a) => {
      const { data } = await supabase.rpc("get_contact", { p_other: a.job!.poster_id! }).maybeSingle();
      if (data) contacts.set(a.id, data);
    }),
  );

  return (
    <PageShell title="המועמדויות שלי" subtitle={<Link href="/jobs" className="underline underline-offset-4">למציאת עבודות</Link>}>
      {!apps?.length ? <p className="text-muted">עוד לא הגשת מועמדות.</p> : null}
      <ul className="flex flex-col gap-3">
        {apps?.map((a) => {
          const c = contacts.get(a.id);
          return (
            <li key={a.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
              <Link href={`/jobs/${a.job?.id}`} className="font-bold hover:underline">{a.job?.title}</Link>
              <p className="text-sm"><b>{APP_STATUS_LABEL[a.status]}</b> <span className="text-muted">· נשלחה {timeAgo(a.sent_at)}{a.viewed_at && a.status === "viewed" ? "" : ""}</span></p>
              {c ? (
                <p className="rounded-xl bg-background p-3 text-sm">
                  המפרסם: <bdi>{c.full_name}</bdi> · <a href={`tel:${c.phone}`} dir="ltr" className="underline">{formatIlPhone(c.phone)}</a> ·{" "}
                  <a href={`https://wa.me/${c.phone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="underline">WhatsApp</a>
                </p>
              ) : null}
              {["sent", "viewed", "shortlisted", "contacted"].includes(a.status) ? <Withdraw appId={a.id} /> : null}
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
