import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { DEFAULT_ADMIN_INVITE_TEXT, mailConfigured } from "@/lib/mail";
import { Card } from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { InviteAdminForm } from "./invite-form";
import { removeAdmin, revokeInvite } from "./actions";

const roleLabel = (r: string) => (r === "admin" ? "אדמין" : "בודק/ת");
const date = (iso: string) => new Date(iso).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" });

export default async function AdminsPage() {
  const { me, role } = await requireAdmin();
  if (role !== "admin") redirect("/admin");
  const supabase = await createClient();
  const [{ data: admins }, { data: invites }] = await Promise.all([
    supabase.rpc("admin_list_admins"),
    supabase.from("admin_invites").select("id, email, full_name, role, created_at, expires_at")
      .eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[26px] font-bold">אדמינים</h1>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold">הזמנת אדמין</h2>
          <p className="text-sm text-muted">המוזמן/ת יקבל/ת מייל בעברית עם קישור. אחרי כניסה רגילה (קוד SMS או Google) מאשרים את ההזמנה בלחיצה. הקישור בתוקף 7 ימים.</p>
        </div>
        <InviteAdminForm defaultMessage={DEFAULT_ADMIN_INVITE_TEXT} mailReady={mailConfigured()} />
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="pending-h">
        <h2 id="pending-h" className="text-lg font-bold">הזמנות ממתינות</h2>
        {invites?.length ? invites.map((i) => {
          const expired = new Date(i.expires_at) < now;
          return (
            <Card key={i.id} className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.full_name} · {roleLabel(i.role)}</p>
                <p dir="ltr" className="text-start text-sm text-muted">{i.email}</p>
                <p className={expired ? "text-xs font-semibold text-danger" : "text-xs text-muted"}>
                  {expired ? "פג תוקף — שלחו הזמנה חדשה" : `נשלחה ${date(i.created_at)} · בתוקף עד ${date(i.expires_at)}`}
                </p>
              </div>
              <ActionButton action={revokeInvite.bind(null, i.id)} label="ביטול ההזמנה" pendingLabel="מבטלים…"
                confirm={`לבטל את ההזמנה של ${i.full_name}? הקישור יפסיק לעבוד.`} confirmLabel="ביטול ההזמנה" />
            </Card>
          );
        }) : <p className="text-sm text-muted">אין הזמנות ממתינות.</p>}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="admins-h">
        <h2 id="admins-h" className="text-lg font-bold">אדמינים פעילים</h2>
        {admins?.map((a) => (
          <Card key={a.user_id} className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold"><bdi>{a.full_name ?? "ללא שם"}</bdi> · {roleLabel(a.role)}{a.user_id === me.userId ? " (את/ה)" : ""}</p>
              {a.email ? <p dir="ltr" className="text-start text-sm text-muted">{a.email}</p> : null}
              <p className="text-xs text-muted">מאז {date(a.created_at)}</p>
            </div>
            {a.user_id !== me.userId ? (
              <ActionButton action={removeAdmin.bind(null, a.user_id)} label="הסרת הרשאה" pendingLabel="מסירים…"
                confirm={`להסיר את הרשאות הניהול של ${a.full_name ?? "המשתמש"}? החשבון עצמו נשאר.`} confirmLabel="הסרה" />
            ) : null}
          </Card>
        ))}
      </section>
    </div>
  );
}
