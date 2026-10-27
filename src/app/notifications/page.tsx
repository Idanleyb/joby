import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, nextStep } from "@/lib/onboarding";
import { notificationText } from "@/lib/notification-text";
import { timeAgo } from "@/lib/jobs";
import { Button, PageShell } from "@/components/ui";
import { markAllRead } from "./actions";
import { NotificationItem } from "./notification-item";

export const metadata: Metadata = { title: "התראות · Joby" };

export default async function NotificationsPage() {
  const me = await getMe();
  if (!me || nextStep(me) !== "/account") redirect(me ? nextStep(me) : "/login?next=/notifications");
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notifications").select("id, event, payload, read_at, created_at")
    .eq("user_id", me.userId).eq("in_app", true).order("created_at", { ascending: false }).limit(100);
  const unread = (rows ?? []).filter((r) => !r.read_at).length;

  return (
    <PageShell title="התראות" subtitle={unread ? `${unread} חדשות` : "אין התראות חדשות"}>
      {unread ? (
        <form action={markAllRead}><Button type="submit" variant="ghost" className="px-0">סימון הכול כנקרא</Button></form>
      ) : null}
      {!rows?.length ? <p className="rounded-2xl bg-background p-6 text-center text-muted">עוד אין התראות. כאן יופיעו עבודות חדשות שמתאימות לך, עדכונים על מועמדויות ועוד.</p> : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((r) => {
            const n = notificationText(r.event, (r.payload ?? {}) as Record<string, unknown>);
            return <li key={r.id}><NotificationItem id={r.id} icon={n.icon} text={n.text} href={n.href} when={timeAgo(r.created_at)} unread={!r.read_at} /></li>;
          })}
        </ul>
      )}
    </PageShell>
  );
}
