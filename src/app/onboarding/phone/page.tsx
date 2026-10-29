import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { safeNext } from "@/lib/next-param";
import { PhoneOtpForm } from "@/components/phone-otp-form";
import { Card, PageShell } from "@/components/ui";
import { ContactPhoneForm } from "./contact-phone-form";

export const metadata: Metadata = { title: "טלפון · Joby" };

export default async function AddPhonePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const me = await getMe();
  const step = nextStep(me);
  if (step !== "/onboarding/phone") redirect(step);

  // Google already verified the account: just the number, no SMS code (founder, 2026-10-29).
  if (me?.googleVerified) {
    return (
      <PageShell title="מה מספר הנייד שלך?" subtitle="דרכו נשלח לך עדכונים על עבודות ופניות ב-WhatsApp, וישותף רק עם מי שתעבדו איתו.">
        <Card><ContactPhoneForm next={next} /></Card>
      </PageShell>
    );
  }
  return (
    <PageShell
      title="נשאר רק לאמת טלפון"
      subtitle="דרכו נשלח לך התראות על עבודות ופניות ב-WhatsApp, ומפרסמים יראו שהמספר מאומת."
    >
      <Card>
        <PhoneOtpForm mode="add" next={next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding"} />
      </Card>
    </PageShell>
  );
}
