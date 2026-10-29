import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMe, nextStep } from "@/lib/onboarding";
import { appErrorMessage } from "@/lib/errors";
import { Button, Card, PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "הזמנה לניהול Joby", robots: { index: false } };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

const linkClass = "inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-contrast";

export default async function AdminInvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f]{20,64}$/.test(token)) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_admin_invite", { p_token: token });
  const invite = data?.[0];
  const me = await getMe();
  const here = `/invite/admin/${token}`;

  async function accept() {
    "use server";
    const s = await createClient();
    const { error } = await s.rpc("accept_admin_invite", { p_token: token });
    if (error) redirect(`${here}?error=${encodeURIComponent(error.message)}`);
    revalidatePath("/", "layout");
    redirect("/admin");
  }

  const valid = invite && invite.status === "pending" && !invite.expired;
  const step = nextStep(me);
  const roleText = invite?.role === "reviewer" ? "בודק/ת (תורי אימות ובדיקת עבודות)" : "אדמין";

  return (
    <PageShell title={invite ? `היי ${invite.full_name},` : "הזמנה לניהול Joby"}
      subtitle={valid ? `קיבלת הזמנה מ-JOBY להיות ${roleText} במערכת${invite.inviter ? ` (נשלחה על ידי ${invite.inviter})` : ""}.` : undefined}>
      <Card className="flex flex-col gap-4">
        {!valid ? (
          <p>{!invite ? "ההזמנה לא נמצאה." : invite.status === "accepted" ? "ההזמנה כבר אושרה." : invite.expired && invite.status === "pending" ? "תוקף ההזמנה פג. בקשו הזמנה חדשה מאדמין." : "ההזמנה בוטלה."}</p>
        ) : !me ? (
          <>
            <p className="text-sm text-muted">כדי לאשר צריך להיכנס או להירשם — עם מספר הטלפון שלך (קוד SMS) או עם Google, ולאמת את כתובת המייל שאליה נשלחה ההזמנה: <span dir="ltr">{invite.email_hint}</span>.</p>
            <Link prefetch={false} href={`/login?next=${encodeURIComponent(here)}`} className={linkClass}>כניסה או הרשמה</Link>
          </>
        ) : step !== "/account" && step !== "/onboarding/poster" ? (
          <>
            <p className="text-sm text-muted">עוד צעד קטן לפני האישור: להשלים את ההרשמה.</p>
            <Link prefetch={false} href={`/onboarding?next=${encodeURIComponent(here)}`} className={linkClass}>להשלמת ההרשמה</Link>
          </>
        ) : (
          <form action={accept} className="flex flex-col gap-3">
            <p className="text-sm text-muted">ההזמנה נשלחה אל <span dir="ltr">{invite.email_hint}</span>. אפשר לאשר רק מחשבון שהמייל הזה מאומת בו{me.email ? <> (בחשבון הזה: <span dir="ltr">{me.email}</span>)</> : null}.</p>
            {error ? <p role="alert" className="text-sm font-medium text-danger">{appErrorMessage({ message: error })}</p> : null}
            <Button type="submit">אישור ההזמנה</Button>
          </form>
        )}
      </Card>
    </PageShell>
  );
}
