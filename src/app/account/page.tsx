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
import { NotificationPrefs } from "./notification-prefs";
import { DaysBandToggle } from "@/app/provider/onboarding/photo/photo-controls";

export const metadata: Metadata = { title: "החשבון שלי · Joby" };

const BAND: Record<string, string> = { "30-59": "30+", "60-119": "60+", "120+": "120+" };

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
    supabase.from("provider_profiles").select("provider_type, verification_status, onboarding_step, days_band, show_days_band, city").eq("user_id", me.userId).maybeSingle(),
    supabase.from("provider_wallets").select("balance").eq("provider_id", me.userId).maybeSingle(),
    supabase.from("admins").select("role").eq("user_id", me.userId).maybeSingle(),
  ]);
  const { data: account } = await supabase.from("profiles").select("email, notification_prefs").eq("id", me.userId).single();
  const prefs = { job_alerts: "instant", whatsapp: true, email_digest: true, ...((account?.notification_prefs ?? {}) as object) } as {
    job_alerts: "instant" | "off"; whatsapp: boolean; email_digest: boolean;
  };
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
    <PageShell title="החשבון שלי">
      {me.suspended ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">החשבון מושעה. לבירור פנו לתמיכה.</p>
      ) : null}
      {justFinished ? <p role="status" className="rounded-xl bg-info px-4 py-3 text-sm">הפרופיל נשמר ✓</p> : null}

      {approved && provider ? (
        <div className="flex items-center gap-4 rounded-2xl bg-brand p-5 text-brand-contrast">
          <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-2xl">🎖</span>
          <div className="flex flex-col">
            <span className="text-lg font-bold">{provider.provider_type === "spouse" ? "בן/בת זוג של מילואימניק מאומת" : "מילואימניק/ית מאומת/ת"}</span>
            {provider.provider_type === "reservist" && provider.days_band ? (
              <span className="text-sm opacity-90">{BAND[provider.days_band]} ימי מילואים מאז 7 באוקטובר 2023</span>
            ) : null}
          </div>
        </div>
      ) : null}
      {approved && provider?.provider_type === "reservist" && provider.days_band ? <DaysBandToggle checked={provider.show_days_band} /> : null}

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">פרטים אישיים</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted">שם</dt><dd className="font-semibold"><bdi>{me.fullName}</bdi></dd>
          <dt className="text-muted">טלפון</dt><dd><span dir="ltr">{formatIlPhone(me.phone)}</span>{me.phoneVerified ? " ✓" : null}</dd>
          {me.googleVerified ? <><dt className="text-muted">כניסה</dt><dd>Google ✓</dd></> : null}
          <dt className="text-muted">מייל</dt><dd dir="ltr" className="text-end">{account?.email ?? <span className="text-muted">לא הוזן</span>}</dd>
          <dt className="text-muted">עיר</dt><dd>{provider?.city ?? poster?.city ?? <span className="text-muted">לא הוזנה</span>}</dd>
          {approved ? <><dt className="text-muted">קרדיטים</dt><dd><b>{wallet?.balance ?? 0}</b> · <Link href="/provider/credits" className="underline">היסטוריה</Link></dd></> : null}
        </dl>
        <p className="text-xs text-muted">שינוי עיר: באזור העבודה בפרופיל{poster ? " או בפרופיל המפרסם" : ""}. לשינוי טלפון או מייל פנו לתמיכה.</p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 id="provider" className="text-lg font-bold">מציע/ה שירותים</h2>
        {provider ? (
          <>
            <p className="text-sm">
              סטטוס: <span className="font-semibold">{VERIFICATION_LABEL[provider.verification_status]}</span>
              {provider.provider_type === "spouse" ? " · בן/בת זוג של מילואימניק" : null}
            </p>
            {provider.onboarding_step < 8 ? (
              <Link href="/provider/onboarding" className={`${linkCls} bg-brand text-brand-contrast`}>המשך לבנות את הפרופיל</Link>
            ) : (
              <Link href="/profile" className={`${linkCls} border border-border`}>לפרופיל שלי</Link>
            )}
            {["more_info", "rejected"].includes(provider.verification_status) ? (
              <Link href="/provider/onboarding/proof" className="text-sm font-semibold text-foreground underline">לפרטים ולהעלאה מחדש</Link>
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
              <Link href="/profile/edit" className={`${linkCls} border border-border`}>עריכת פרופיל מפרסם</Link>
            </div>
          </>
        ) : (
          <Link href="/onboarding/poster" className={`${linkCls} border border-border bg-surface hover:bg-background`}>אני רוצה לפרסם עבודות</Link>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">התראות</h2>
        <NotificationPrefs initial={prefs} provider={Boolean(provider)} />
      </Card>

      <Link href="/how-it-works" className="text-center text-sm font-semibold underline">איך Joby עובד — כולל חוקי הקרדיטים</Link>
      {admin ? <Link href="/admin" className="text-center text-sm font-semibold underline">ניהול (Admin)</Link> : null}

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" className="w-full">התנתקות</Button>
      </form>
    </PageShell>
  );
}
