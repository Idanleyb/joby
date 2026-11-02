import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { Card, DemoBadge, cx } from "@/components/ui";

const PERIODS = [["7d", "7 ימים אחרונים"], ["30d", "30 ימים אחרונים"], ["month", "החודש"], ["all", "הכול"]] as const;
type Period = (typeof PERIODS)[number][0];

/** Start of the period; "this month" starts on the 1st at midnight Israel time. */
function periodStart(period: Period): string | null {
  const now = new Date();
  if (period === "7d") return new Date(now.getTime() - 7 * 86_400_000).toISOString();
  if (period === "30d") return new Date(now.getTime() - 30 * 86_400_000).toISOString();
  if (period === "month") {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", timeZoneName: "longOffset" }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const offset = get("timeZoneName").replace("GMT", "") || "+00:00";
    return new Date(`${get("year")}-${get("month")}-01T00:00:00${offset}`).toISOString();
  }
  return null;
}

/** Admin: credits used per provider for a period — spent, refunded, net (founder, 2026-11-02). */
export default async function AdminCreditsPage({ searchParams }: { searchParams: Promise<{ period?: string; demo?: string }> }) {
  const { role } = await requireAdmin();
  if (role !== "admin") redirect("/admin");
  const sp = await searchParams;
  const period: Period = PERIODS.some(([k]) => k === sp.period) ? (sp.period as Period) : "30d";
  const demo = sp.demo === "1";
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("admin_credit_usage", { p_from: periodStart(period), p_include_demo: demo });
  const list = rows ?? [];
  const total = list.reduce((t, r) => ({ spent: t.spent + r.spent, refunded: t.refunded + r.refunded, net: t.net + r.net_used, apps: t.apps + r.applications, reqs: t.reqs + r.requests }),
    { spent: 0, refunded: 0, net: 0, apps: 0, reqs: 0 });
  const href = (p: Period, d = demo) => `/admin/credits?period=${p}${d ? "&demo=1" : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[26px] font-bold">שימוש בקרדיטים</h1>
      <nav aria-label="תקופה" className="flex flex-wrap gap-2">
        {PERIODS.map(([k, label]) => (
          <Link prefetch={false} key={k} href={href(k)} aria-current={k === period ? "page" : undefined}
            className={cx("rounded-full border px-3 py-1.5 text-sm font-semibold", k === period ? "border-foreground bg-foreground text-surface" : "border-border bg-surface")}>{label}</Link>
        ))}
        <Link prefetch={false} href={href(period, !demo)} className="ms-auto self-center text-sm underline">{demo ? "בלי חשבונות דמו" : "כולל חשבונות דמו"}</Link>
      </nav>

      <div className="grid gap-3 sm:grid-cols-4">
        {[["נוצלו (נטו)", total.net], ["ירדו", total.spent], ["הוחזרו", total.refunded], ["נותני שירות", list.length]].map(([l, v]) => (
          <Card key={l as string} className="p-4 sm:p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-bold">{v}</p></Card>
        ))}
      </div>
      <p className="text-xs text-muted">ירדו = הגשות מועמדות ({total.apps}) ואישורי פניות ({total.reqs}). נוצלו = ירדו פחות החזרים. מתנות ועדכוני אדמין לא נספרים.</p>

      {list.length ? (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-chip text-xs text-muted">
              <tr><th className="p-3 text-start">נותן/ת שירות</th><th className="p-3 text-end">הגשות</th><th className="p-3 text-end">פניות</th><th className="p-3 text-end">ירדו</th><th className="p-3 text-end">הוחזרו</th><th className="p-3 text-end">נוצלו</th><th className="p-3 text-end">יתרה</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((r) => (
                <tr key={r.provider_id}>
                  <td className="p-3"><Link prefetch={false} href={`/admin/users/${r.provider_id}`} className="underline"><bdi>{r.full_name ?? "ללא שם"}</bdi></Link>{r.is_demo ? <DemoBadge className="ms-1" /> : null}</td>
                  <td className="p-3 text-end">{r.applications}</td><td className="p-3 text-end">{r.requests}</td>
                  <td className="p-3 text-end">{r.spent}</td><td className="p-3 text-end">{r.refunded}</td>
                  <td className="p-3 text-end font-bold">{r.net_used}</td><td className="p-3 text-end text-muted">{r.balance ?? 0}</td>
                </tr>
              ))}
              <tr className="bg-chip font-bold"><td className="p-3">סה״כ</td><td className="p-3 text-end">{total.apps}</td><td className="p-3 text-end">{total.reqs}</td><td className="p-3 text-end">{total.spent}</td><td className="p-3 text-end">{total.refunded}</td><td className="p-3 text-end">{total.net}</td><td /></tr>
            </tbody>
          </table>
        </div>
      ) : <Card><p className="text-sm text-muted">אין שימוש בקרדיטים בתקופה הזו.</p></Card>}
    </div>
  );
}
