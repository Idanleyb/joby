import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";
import { formatIlPhone } from "@/lib/phone";
import { siteUrl } from "@/lib/site-url";
import { Button, Card, PageShell } from "@/components/ui";
import { becomeProvider } from "./actions";
import { SpouseInviteForm, SpouseInviteShare } from "./spouse-invite";

export const metadata: Metadata = { title: "החשבון שלי · Joby" };

const POSTER_TYPE_LABEL: Record<string, string> = { private: "אדם פרטי", business: "עסק", hr: "מגייס/ת", public_body: "גוף ציבורי או עמותה" };
const VERIFICATION_LABEL: Record<string, string> = {
  draft: "טרם הוגש אימות",
  pending: "האימות בבדיקה",
  more_info: "נדרש מידע נוסף לאימות",
  approved: "מאומת ✓",
  rejected: "האימות נדחה",
};
const SPOUSE_STATUS: Record<string, string> = { accepted: "ההזמנה התקבלה — ממתין לאישור המסמכים", approved: "מקושר/ת ומאומת/ת ✓" };
const linkCls = "inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-semibold";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ profile?: string }> }) {
  const me = await getMe();
  const step = nextStep(me);
  if (step !== "/account" || !me) redirect(step);
  const { profile: justFinished } = await searchParams;

  const supabase = await createClient();
  const [{ data: poster }, { data: provider }, { data: wallet }, { data: admin }] = await Promise.all([
    supabase.from("poster_profiles").select("display_name, poster_type, city").eq("user_id", me.userId).maybeSingle(),
    supabase.from("provider_profiles").select("provider_type, verification_status, onboarding_step").eq("user_id", me.userId).maybeSingle(),
    supabase.from("provider_wallets").select("balance").eq("provider_id", me.userId).maybeSingle(),
    supabase.from("admins").select("role").eq("user_id", me.userId).maybeSingle(),
  ]);
  const approved = provider?.verification_status === "approved";
  const { data: link } =
    provider?.provider_type === "reservist" && approved
      ? await supabase
          .from("spouse_links")
          .select("id, status, invite_name, invite_phone, invite_token, expires_at")
          .eq("reservist_id", me.userId)
          .in("status", ["invited", "accepted", "approved"])
          .maybeSingle()
      : { data: null };
  const firstName = me.fullName?.split(" ")[0] ?? "";
  const base = await siteUrl();

  return (
    <PageShell title={`שלום${firstName ? `, ${firstName}` : ""}`} subtitle={<span dir="ltr">{formatIlPhone(me.phone)}</span>}>
      {me.suspended ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">החשבון מושעה. לבירור פנו לתמיכה.</p>
      ) : null}
      {justFinished ? <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm dark:bg-emerald-950/30">הפרופיל נשמר ✓</p> : null}

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">מציע/ה שירותים</h2>
        {provider ? (
          <>
            <p className="text-sm">
              סטטוס: <span className="font-semibold">{VERIFICATION_LABEL[provider.verification_status]}</span>
              {provider.provider_type === "spouse" ? " · בן/בת זוג של מילואימניק" : null}
            </p>
            {approved ? (
              <>
                <p className="text-sm">יתרת קרדיטים: <span className="font-bold">{wallet?.balance ?? 0}</span> · <Link href="/provider/credits" className="underline">פירוט</Link></p>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/jobs" className={`${linkCls} bg-brand text-brand-contrast`}>מציאת עבודות</Link>
                  <Link href="/provider/applications" className={`${linkCls} border border-border`}>המועמדויות שלי</Link>
                </div>
              </>
            ) : null}
            {provider.onboarding_step < 8 ? (
              <Link href="/provider/onboarding" className={`${linkCls} bg-brand text-brand-contrast`}>המשך לבנות את הפרופיל</Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/provider/onboarding/about" className={`${linkCls} border border-border`}>עריכת הפרופיל</Link>
                <Link href={`/providers/${me.userId}`} className={`${linkCls} border border-border`}>צפייה בפרופיל</Link>
              </div>
            )}
            {["more_info", "rejected"].includes(provider.verification_status) ? (
              <Link href="/provider/onboarding/proof" className="text-sm font-semibold text-accent-strong underline">לפרטים ולהעלאה מחדש</Link>
            ) : null}
          </>
        ) : (
          <form action={becomeProvider} className="flex flex-col gap-2">
            <p className="text-sm text-muted">מילואימניק/ית עם 30 ימי מילואים ומעלה מאז 7 באוקטובר 2023?</p>
            <Button type="submit" variant="secondary">אני רוצה להציע שירותים</Button>
          </form>
        )}
      </Card>

      {provider?.provider_type === "reservist" && approved ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">בן/בת זוג</h2>
          {link && link.status === "invited" ? (
            <SpouseInviteShare linkId={link.id} url={`${base}/invite/${link.invite_token}`} phone={link.invite_phone} name={link.invite_name} reservist={firstName} />
          ) : link ? (
            <p className="text-sm">{link.invite_name}: {SPOUSE_STATUS[link.status]}</p>
          ) : (
            <>
              <p className="text-sm text-muted">בן או בת הזוג שלך יכולים להציע שירותים ב-Joby. אחרי ההזמנה הם מעלים אישור זוגיות לבדיקה.</p>
              <SpouseInviteForm />
            </>
          )}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">מפרסם/ת עבודות</h2>
        {poster ? (
          <>
            <p className="text-sm"><bdi>{poster.display_name}</bdi> · {POSTER_TYPE_LABEL[poster.poster_type]} · {poster.city}</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/jobs/new" className={`${linkCls} bg-brand text-brand-contrast`}>פרסום עבודה</Link>
              <Link href="/poster/jobs" className={`${linkCls} border border-border`}>העבודות שלי</Link>
            </div>
          </>
        ) : (
          <Link href="/onboarding/poster" className={`${linkCls} border border-border bg-surface hover:bg-background`}>אני רוצה לפרסם עבודות</Link>
        )}
      </Card>

      {admin ? <Link href="/admin" className="text-center text-sm font-semibold underline">ניהול (Admin)</Link> : null}

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" className="w-full">התנתקות</Button>
      </form>
    </PageShell>
  );
}
