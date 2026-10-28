import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { hoursSince } from "@/lib/admin";
import { reasonText } from "@/lib/provider";
import { cx } from "@/components/ui";

const STATUS: Record<string, string> = { pending: "ממתין", more_info: "ביקשנו מידע", approved: "אושר", rejected: "נדחה" };

export default async function VerificationQueue({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const view = (await searchParams).view === "done" ? "done" : "open";
  const supabase = await createClient();
  const q = supabase
    .from("verification_requests")
    .select("id, user_id, kind, status, days_total, days_band, duplicate_suspected, submitted_at, decided_at, decision_reason")
    .order(view === "open" ? "submitted_at" : "decided_at", { ascending: view === "open" })
    .limit(100);
  const { data: rows } = view === "open" ? await q.in("status", ["pending", "more_info"]) : await q.in("status", ["approved", "rejected"]);
  const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-extrabold">אימותים</h1>
        <Link href="/admin/verifications" className={cx("text-sm", view === "open" ? "font-bold underline" : "text-muted")}>פתוחים</Link>
        <Link href="/admin/verifications?view=done" className={cx("text-sm", view === "done" ? "font-bold underline" : "text-muted")}>הוחלטו</Link>
      </div>
      {!rows?.length ? (
        <p className="text-muted">{view === "open" ? "אין אימותים ממתינים." : "עדיין אין החלטות."}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-background text-right text-xs text-muted">
              <tr><th className="p-3">שם</th><th className="p-3">סוג</th><th className="p-3">ימים</th><th className="p-3">סטטוס</th><th className="p-3">{view === "open" ? "ממתין" : "הוחלט"}</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const age = hoursSince(r.submitted_at);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-semibold">
                      {name.get(r.user_id) ?? "—"}
                      {r.duplicate_suspected ? <span className="ms-2 rounded-full bg-danger-bg px-2 py-0.5 text-xs text-danger">ת״ז כפולה?</span> : null}
                    </td>
                    <td className="p-3">{r.kind === "spouse" ? "בן/בת זוג" : "טופס 3010"}</td>
                    <td className="p-3">{r.days_total ?? r.days_band ?? "—"}</td>
                    <td className="p-3">{STATUS[r.status]}{r.decision_reason && view === "done" ? ` · ${reasonText(r.decision_reason)}` : ""}</td>
                    <td className={cx("p-3", view === "open" && age >= 20 && "font-bold text-danger")}>
                      {view === "open" ? `${age} ש׳` : r.decided_at?.slice(0, 10)}
                    </td>
                    <td className="p-3">{view === "open" ? <Link href={`/admin/verifications/${r.id}`} className="font-semibold text-foreground underline">בדיקה</Link> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
