import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { Card, cx } from "@/components/ui";
import { TEMPLATE_NAMES } from "@/lib/email/templates";

export const metadata = { title: "ביצועי מיילים · ניהול · Joby" };

const PERIODS = [7, 30, 90] as const;
const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

/** Email performance per template (PRD v1.7): sent, delivered, opened, clicked, and the action that followed. */
export default async function AdminEmailsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.days) as (typeof PERIODS)[number]) ? Number(sp.days) : 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_email_stats", { p_days: days });
  const rows = data ?? [];
  const total = rows.reduce(
    (a, r) => ({ emails: a.emails + r.emails, delivered: a.delivered + r.delivered, opened: a.opened + r.opened, clicked: a.clicked + r.clicked, bounced: a.bounced + r.bounced }),
    { emails: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 },
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold">ביצועי מיילים</h1>
          <p className="text-sm text-muted">לכל תבנית: כמה נשלחו, נפתחו ונלחצו, וכמה מהנמענים עשו את מה שהמייל ביקש תוך 14 ימים.</p>
        </div>
        <div className="flex rounded-xl border border-border bg-background p-1 text-sm">
          {PERIODS.map((d) => (
            <Link prefetch={false} key={d} href={`/admin/emails?days=${d}`} aria-current={d === days ? "page" : undefined}
              className={cx("rounded-lg px-3 py-1.5", d === days && "bg-surface font-semibold shadow-sm")}>{d} ימים</Link>
          ))}
        </div>
      </div>

      {error ? <p className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">לא הצלחנו לטעון את הנתונים.</p> : null}

      <div className="grid gap-3 sm:grid-cols-4">
        {[["נשלחו", String(total.emails)], ["נמסרו", pct(total.delivered, total.emails)], ["נפתחו", pct(total.opened, total.delivered || total.emails)], ["לחיצות", pct(total.clicked, total.delivered || total.emails)]].map(([l, v]) => (
          <Card key={l}><p className="text-sm text-muted">{l}</p><p className="text-2xl font-bold">{v}</p></Card>
        ))}
      </div>

      {rows.length ? (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-background text-muted">
              <tr className="text-right">
                {["תבנית", "נשלחו", "נמסרו", "נפתחו", "לחיצות", "פעולה אחרי המייל", "חזרו / תלונות"].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const base = r.delivered || r.emails;
                return (
                  <tr key={r.template} className="border-t border-border">
                    <td className="px-3 py-2"><span dir="ltr" className="me-2 text-muted">{r.template.replace(/_/g, ".")}</span>{TEMPLATE_NAMES[r.template] ?? r.template}</td>
                    <td className="px-3 py-2 tabular-nums">{r.emails}</td>
                    <td className="px-3 py-2 tabular-nums">{pct(r.delivered, r.emails)}</td>
                    <td className="px-3 py-2 tabular-nums">{pct(r.opened, base)}</td>
                    <td className="px-3 py-2 tabular-nums">{pct(r.clicked, base)}</td>
                    <td className="px-3 py-2 tabular-nums">{r.measurable ? `${pct(r.converted, r.measurable)} (${r.converted})` : "—"}</td>
                    <td className={cx("px-3 py-2 tabular-nums", (r.bounced > 0 || r.complained > 0) && "font-semibold text-danger")}>{r.bounced} / {r.complained}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl bg-background p-6 text-center text-muted">עוד לא נשלחו מיילים בתקופה הזו.</p>
      )}

      <p className="text-xs leading-relaxed text-muted">
        פתיחות הן הערכה בלבד: אפליקציות דואר מסוימות טוענות את התמונות מראש (ומדווחות פתיחה שלא הייתה), ואחרות חוסמות אותן. לחיצות והפעולה שאחרי המייל הן המדד האמין.
        &quot;פעולה אחרי המייל&quot;: השלמת פרופיל, הגשה, מענה לפנייה, משוב, פרסום משרה או פתיחת הגשות — לפי סוג המייל, תוך 14 ימים. נמסרו / נפתחו / לחיצות מתעדכנים מ-Resend.
      </p>
    </div>
  );
}
