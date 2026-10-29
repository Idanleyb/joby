import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe, nextStep } from "@/lib/onboarding";
import { appErrorMessage } from "@/lib/errors";
import { Button, Card, PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "הזמנה ל-Joby" };

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const { error } = await searchParams;
  if (!/^[0-9a-f]{20,64}$/.test(token)) redirect("/");
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_spouse_invite", { p_token: token });
  const invite = data?.[0];
  const me = await getMe();
  const here = `/invite/${token}`;

  async function accept() {
    "use server";
    const s = await createClient();
    const { error } = await s.rpc("accept_spouse_invite", { p_token: token });
    if (error) redirect(`${here}?error=${encodeURIComponent(error.message)}`);
    redirect("/provider/onboarding");
  }

  const expired = invite && (invite.status === "expired" || new Date(invite.expires_at) < new Date());
  const valid = invite && invite.status === "invited" && !expired;

  return (
    <PageShell title="הוזמנת ל-Joby" subtitle={invite ? `${invite.reservist_name} הזמין/ה אותך כבן/בת זוג להציע שירותים במרקטפלייס של המילואים.` : undefined}>
      <Card className="flex flex-col gap-4">
        {!valid ? (
          <p>{!invite ? "ההזמנה לא נמצאה." : expired ? "תוקף ההזמנה פג. בקשו הזמנה חדשה." : "ההזמנה כבר נוצלה או בוטלה."}</p>
        ) : !me ? (
          <>
            <p className="text-sm text-muted">כדי לקבל את ההזמנה צריך להיכנס או להירשם — עם מספר הטלפון שלך או עם Google.</p>
            <Link prefetch={false} href={`/login?next=${encodeURIComponent(here)}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-contrast">כניסה או הרשמה</Link>
          </>
        ) : nextStep(me) !== "/account" && nextStep(me) !== "/onboarding/poster" ? (
          <Link prefetch={false} href={`/onboarding?next=${encodeURIComponent(here)}`} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-contrast">להשלמת ההרשמה</Link>
        ) : (
          <form action={accept} className="flex flex-col gap-3">
            <p className="text-sm text-muted">אחרי האישור תתבקש/י להעלות מסמך שמאשר את הזוגיות (תעודת נישואין, ספח ת״ז, או לידועים בציבור — תצהיר).</p>
            {error ? <p role="alert" className="text-sm font-medium text-danger">{appErrorMessage({ message: error })}</p> : null}
            <Button type="submit">אישור ההזמנה</Button>
          </form>
        )}
      </Card>
    </PageShell>
  );
}
