import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";
import { formatIlPhone } from "@/lib/phone";
import { Button, Card, PageShell } from "@/components/ui";
import { becomeProvider } from "./actions";

export const metadata: Metadata = { title: "החשבון שלי · Joby" };

const POSTER_TYPE_LABEL: Record<string, string> = {
  private: "אדם פרטי",
  business: "עסק",
  hr: "מגייס/ת",
  public_body: "גוף ציבורי או עמותה",
};

const VERIFICATION_LABEL: Record<string, string> = {
  draft: "טרם הוגש אימות",
  pending: "האימות בבדיקה",
  more_info: "נדרש מידע נוסף",
  approved: "מאומת",
  rejected: "האימות נדחה",
};

export default async function AccountPage() {
  const me = await getMe();
  const step = nextStep(me);
  if (step !== "/account" || !me) redirect(step);

  const supabase = await createClient();
  const [{ data: poster }, { data: provider }] = await Promise.all([
    supabase.from("poster_profiles").select("display_name, poster_type, city").eq("user_id", me.userId).maybeSingle(),
    supabase.from("provider_profiles").select("provider_type, verification_status").eq("user_id", me.userId).maybeSingle(),
  ]);
  const firstName = me.fullName?.split(" ")[0] ?? "";

  return (
    <PageShell title={`שלום${firstName ? `, ${firstName}` : ""}`} subtitle={<span dir="ltr">{formatIlPhone(me.phone)}</span>}>
      {me.suspended ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          החשבון מושעה. לבירור פנו לתמיכה.
        </p>
      ) : null}

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">מציע/ה שירותים</h2>
        {provider ? (
          <>
            <p className="text-sm">
              סטטוס: <span className="font-semibold">{VERIFICATION_LABEL[provider.verification_status]}</span>
              {provider.provider_type === "spouse" ? " · בן/בת זוג של מילואימניק" : null}
            </p>
            <p className="text-sm text-muted">אשף הפרופיל ואימות טופס 3010 יגיעו בשלב הבא של הבנייה.</p>
          </>
        ) : (
          <form action={becomeProvider} className="flex flex-col gap-2">
            <p className="text-sm text-muted">מילואימניק/ית עם 30 ימי מילואים ומעלה מאז 7 באוקטובר 2023?</p>
            <Button type="submit" variant="secondary">אני רוצה להציע שירותים</Button>
          </form>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">מפרסם/ת עבודות</h2>
        {poster ? (
          <>
            <p className="text-sm">
              {poster.display_name} · {POSTER_TYPE_LABEL[poster.poster_type]} · {poster.city}
            </p>
            <p className="text-sm text-muted">פרסום עבודות יגיע בשלב הבנייה הבא.</p>
          </>
        ) : (
          <Link href="/onboarding/poster" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-5 font-semibold hover:bg-background">
            אני רוצה לפרסם עבודות
          </Link>
        )}
      </Card>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" className="w-full">התנתקות</Button>
      </form>
    </PageShell>
  );
}
