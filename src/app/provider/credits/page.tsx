import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requireProvider } from "@/lib/provider";
import { Card, PageShell, cx } from "@/components/ui";

export const metadata: Metadata = { title: "הקרדיטים שלי · Joby" };

const TX: Record<string, string> = {
  welcome: "מתנת הצטרפות", apply: "הגשת מועמדות", credit_back: "החזר", request_approve: "אישור פנייה ישירה",
  admin_adjust: "עדכון ע״י הצוות", purchase: "רכישה",
};
const REASON: Record<string, string> = {
  job_closed_without_hire: "העבודה נסגרה בלי גיוס", job_expired: "פג תוקף המודעה", job_removed_by_admin: "המודעה הוסרה",
  unopened_30_days: "המפרסם לא פתח את הפנייה 30 ימים",
};

export default async function CreditsPage() {
  const { me } = await requireProvider();
  const supabase = await createClient();
  const [{ data: wallet }, { data: txs }] = await Promise.all([
    supabase.from("provider_wallets").select("balance").eq("provider_id", me.userId).maybeSingle(),
    supabase.from("credit_transactions").select("id, amount, tx_type, reason, balance_after, created_at").eq("provider_id", me.userId).order("created_at", { ascending: false }).limit(100),
  ]);

  return (
    <PageShell title="הקרדיטים שלי">
      <Card className="flex items-baseline justify-between">
        <span className="text-muted">יתרה</span>
        <span className="text-4xl font-extrabold">{wallet?.balance ?? 0}</span>
      </Card>
      <p className="text-sm text-muted">הגשת מועמדות עולה 10 קרדיטים, ואישור פנייה ישירה 2. קרדיטים חוזרים אם העבודה נסגרת בלי גיוס, או אם המפרסם לא פתח את הפנייה תוך 30 ימים.</p>
      <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-surface">
        {!txs?.length ? <li className="p-4 text-sm text-muted">אין תנועות עדיין.</li> : null}
        {txs?.map((t) => (
          <li key={t.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <div className="flex flex-col">
              <span className="font-semibold">{TX[t.tx_type] ?? t.tx_type}</span>
              <span className="text-xs text-muted">{new Date(t.created_at).toLocaleDateString("he-IL")}{t.reason ? ` · ${REASON[t.reason] ?? t.reason}` : ""}</span>
            </div>
            <span className={cx("font-bold", t.amount > 0 ? "text-emerald-700 dark:text-emerald-400" : "")} dir="ltr">{t.amount > 0 ? `+${t.amount}` : t.amount}</span>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
