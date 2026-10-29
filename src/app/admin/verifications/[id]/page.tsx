import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { formatIlPhone } from "@/lib/phone";
import { hoursSince } from "@/lib/admin";
import { Card } from "@/components/ui";
import { DecisionForm } from "./decision-form";

type Extracted = {
  source?: string;
  stated_days?: number;
  warnings?: string[];
  files?: { name: string; ok: boolean; kind: string; fullName: string | null; periods: { from: string; to: string }[]; reportedDays: number | null; note: string }[];
};
const WARN: Record<string, string> = {
  before_start_ignored: "חלק מהימים לפני 7.10.2023 — לא נספרו",
  future_date: "תאריך עתידי — קוצץ להיום",
  invalid_period: "תקופה לא תקינה בטופס",
  used_reported_total: "נעשה שימוש בסה״כ שמודפס בטופס (ללא תאריכים)",
};

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase.from("verification_requests").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [{ data: person }, { data: link }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, is_demo").eq("id", r.user_id).single(),
    r.kind === "spouse"
      ? supabase.from("spouse_links").select("reservist_id, invite_name, status").eq("spouse_user_id", r.user_id).in("status", ["accepted", "approved"]).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const { data: reservist } = link
    ? await supabase.from("profiles").select("full_name").eq("id", link.reservist_id).single()
    : { data: null };
  const { data: reservistProvider } = link
    ? await supabase.from("provider_profiles").select("verification_status").eq("user_id", link.reservist_id).single()
    : { data: null };

  const admin = createServiceClient();
  const docs = await Promise.all(
    (r.file_paths ?? []).map(async (path) => {
      const { data } = await admin.storage.from("verification-docs").createSignedUrl(path, 3600);
      return { path, url: data?.signedUrl ?? null, pdf: path.toLowerCase().endsWith(".pdf") };
    }),
  );
  const ex = (r.extracted ?? {}) as Extracted;
  const open = r.status === "pending" || r.status === "more_info";

  return (
    <div className="flex flex-col gap-5">
      <Link prefetch={false} href="/admin/verifications" className="text-sm text-muted underline">← לתור</Link>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-[26px] font-bold">{person?.full_name ?? "—"}</h1>
        <span dir="ltr" className="text-sm text-muted">{formatIlPhone(person?.phone)}</span>
        <span className="text-sm">{r.kind === "spouse" ? "בן/בת זוג" : "טופס 3010"} · ממתין {hoursSince(r.submitted_at)} ש׳</span>
        {r.duplicate_suspected ? <span className="rounded-full bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">אותה ת״ז נמצאה בחשבון אחר</span> : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          {docs.length ? docs.map((d) => (
            <Card key={d.path} className="flex flex-col gap-2 p-3">
              <a href={d.url ?? "#"} target="_blank" rel="noopener noreferrer" dir="ltr" className="truncate text-left text-xs underline">{d.path.split("/").pop()}</a>
              {d.url ? (d.pdf ? <iframe src={d.url} title="מסמך" className="h-[520px] w-full rounded-lg border border-border" /> : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.url} alt="מסמך" className="w-full rounded-lg border border-border" />
              )) : <p className="text-sm text-danger">הקובץ לא נמצא.</p>}
            </Card>
          )) : <Card><p className="text-sm text-muted">{person?.is_demo ? "חשבון דמו — אין מסמכים אמיתיים. אפשר לאשר או לדחות כדי להמחיש את התהליך." : "המסמכים כבר נמחקו."}</p></Card>}
        </div>

        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 text-sm">
            <p className="font-bold">מה נבדק אוטומטית</p>
            {r.kind === "spouse" ? (
              <>
                <p>מוזמן/ת על ידי: <span className="font-semibold">{reservist?.full_name ?? "—"}</span> ({reservistProvider?.verification_status === "approved" ? "מילואימניק מאומת" : "המילואימניק עדיין לא מאומת"})</p>
                <p>שם בהזמנה: {link?.invite_name ?? "—"}</p>
              </>
            ) : ex.source === "manual" ? (
              <p>ללא קריאה אוטומטית. המשתמש הצהיר על <span className="font-bold">{ex.stated_days}</span> ימים.</p>
            ) : (
              <>
                <p>סה״כ נספרו: <span className="text-lg font-bold">{r.days_total ?? "—"}</span> ימים</p>
                {(ex.warnings ?? []).map((w) => <p key={w} className="text-danger">⚠ {WARN[w] ?? w}</p>)}
                <ul className="flex flex-col gap-2">
                  {(ex.files ?? []).map((f, i) => (
                    <li key={i} className="rounded-xl border border-border p-2">
                      <p className="font-semibold">{f.name} · {f.ok ? "נקרא" : "לא נקרא"}</p>
                      {f.fullName ? <p>שם בטופס: {f.fullName}</p> : null}
                      {f.periods.map((p, j) => <p key={j} dir="ltr" className="text-left text-xs">{p.from} → {p.to}</p>)}
                      {f.reportedDays != null ? <p>סה״כ מודפס: {f.reportedDays}</p> : null}
                      {f.note ? <p className="text-xs text-muted" dir="ltr">{f.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {r.provider_note ? <p className="rounded-xl bg-background p-2">הערת המשתמש: {r.provider_note}</p> : null}
          </Card>
          {open ? (
            <Card><DecisionForm id={r.id} kind={r.kind} days={r.days_total} /></Card>
          ) : (
            <Card><p className="text-sm">הוחלט: {r.status}</p></Card>
          )}
        </div>
      </div>
    </div>
  );
}
