import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, VER_LABEL } from "@/lib/admin";
import { formatIlPhone } from "@/lib/phone";
import { Card, DemoBadge } from "@/components/ui";
import { CreditsAction, EditUserForm, SignInAsAction, StatusAction } from "./user-tools";

const TX: Record<string, string> = { welcome: "מתנת הצטרפות", apply: "הגשת מועמדות", request_approve: "אישור פנייה", credit_back: "החזר", admin_adjust: "עדכון אדמין", purchase: "רכישה" };
const when = (iso: string) => new Date(iso).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" });

/** Admin: one account — fix details, status, credits, or sign in as the user (founder, 2026-11-02). */
export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { role, me } = await requireAdmin();
  if (role !== "admin") redirect("/admin");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: p }, { data: provider }, { data: poster }, { data: wallet }, { data: ledger }, { data: visits }, { data: isAdmin }] = await Promise.all([
    supabase.from("profiles").select("full_name, first_name, last_name, email, email_verified, phone, phone_verified, contact_phone, status, is_provider, is_poster, is_demo, google_verified, created_at, terms_accepted_at").eq("id", id).maybeSingle(),
    supabase.from("provider_profiles").select("provider_type, verification_status, city, display_name, rating_avg, rating_count").eq("user_id", id).maybeSingle(),
    supabase.from("poster_profiles").select("display_name, poster_type, city, company_name").eq("user_id", id).maybeSingle(),
    supabase.from("provider_wallets").select("balance").eq("provider_id", id).maybeSingle(),
    supabase.from("credit_transactions").select("id, amount, tx_type, reason, balance_after, created_at").eq("provider_id", id).order("id", { ascending: false }).limit(10),
    supabase.from("admin_impersonations").select("id, admin_id, reason, started_at, ended_at, expires_at").eq("user_id", id).order("started_at", { ascending: false }).limit(5),
    supabase.from("admins").select("role").eq("user_id", id).maybeSingle(),
  ]);
  if (!p) notFound();
  const phone = p.phone ?? p.contact_phone ?? "";
  const name = p.full_name ?? "ללא שם";

  return (
    <div className="flex flex-col gap-4">
      <Link prefetch={false} href="/admin/users" className="text-sm underline">← משתמשים</Link>
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-[26px] font-bold"><bdi>{name}</bdi></h1>
        {p.is_demo ? <DemoBadge /> : null}
        {isAdmin ? <span className="rounded-md bg-info px-2 py-0.5 text-sm">אדמין</span> : null}
        {p.status === "suspended" ? <span className="rounded-md bg-danger-bg px-2 py-0.5 text-sm text-danger">מושעה</span> : null}
      </header>

      <Card className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <p>טלפון: <span dir="ltr">{phone ? formatIlPhone(phone) : "—"}</span>{p.phone_verified ? " ✓" : " (לא מאומת)"}</p>
        <p>מייל: <span dir="ltr">{p.email ?? "—"}</span>{p.email_verified ? " ✓" : p.email ? " (לא מאומת)" : ""}</p>
        <p>נרשם/ה: {when(p.created_at)}{p.google_verified ? " · Google" : ""}{p.terms_accepted_at ? "" : " · לא סיים/ה הרשמה"}</p>
        <p>נותן/ת שירות: {provider ? `${provider.provider_type === "spouse" ? "בן/בת זוג" : "מילואימניק/ית"} · ${VER_LABEL[provider.verification_status]}` : "לא"}{provider ? <> · <Link prefetch={false} href={`/providers/${id}`} className="underline">פרופיל</Link></> : null}</p>
        <p>מגייס/ת: {poster ? `${poster.display_name} · ${poster.city}` : p.is_poster ? "כן (בלי פרופיל)" : "לא"}{poster ? <> · <Link prefetch={false} href={`/posters/${id}`} className="underline">פרופיל</Link></> : null}</p>
        <p>קרדיטים: <b>{wallet?.balance ?? 0}</b>{provider?.rating_count ? ` · דירוג ${provider.rating_avg} (${provider.rating_count})` : ""}</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">תיקון פרטים</h2>
        <EditUserForm u={{ id, firstName: p.first_name ?? name.split(" ")[0] ?? "", lastName: p.last_name ?? name.split(" ").slice(1).join(" "), email: p.email ?? "", phone, city: provider?.city ?? poster?.city ?? "", isPoster: p.is_poster }} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">פעולות</h2>
        <div className="flex flex-col gap-3">
          <StatusAction userId={id} suspended={p.status === "suspended"} />
          {provider ? <CreditsAction userId={id} /> : null}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 border-danger">
        <h2 className="text-lg font-bold">כניסה לחשבון המשתמש</h2>
        <p className="text-sm text-muted">לתיקונים שאי אפשר לעשות מכאן. החשבון שלך יוחלף בחשבון של המשתמש ל-30 דקות לכל היותר, עם פס אדום בראש המסך. כל פעולה תיעשה בשמו/ה. הכניסה והסיבה נשמרות ביומן. בסיום — היכנסו שוב לחשבון שלכם.</p>
        {isAdmin ? <p className="text-sm font-semibold">אי אפשר להיכנס לחשבון של אדמין.</p> : id === me.userId ? null : <SignInAsAction userId={id} name={name} />}
        {visits?.length ? (
          <ul className="flex flex-col gap-1 text-xs text-muted">
            {visits.map((v) => <li key={v.id}>{when(v.started_at)} · {v.reason}{v.ended_at ? ` · הסתיים ${when(v.ended_at)}` : ""}</li>)}
          </ul>
        ) : null}
      </Card>

      {ledger?.length ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">קרדיטים — 10 תנועות אחרונות</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {ledger.map((t) => (
                <tr key={t.id}><td className="py-1.5">{when(t.created_at)}</td><td>{TX[t.tx_type] ?? t.tx_type}{t.reason ? ` · ${t.reason}` : ""}</td>
                  <td dir="ltr" className="text-end font-semibold">{t.amount > 0 ? `+${t.amount}` : t.amount}</td><td dir="ltr" className="text-end text-muted">{t.balance_after}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
