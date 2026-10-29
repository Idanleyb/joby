import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { safeNext } from "@/lib/next-param";
import { PhoneOtpForm } from "@/components/phone-otp-form";
import { Card, PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "טלפון · Joby" };

/** Every account confirms a mobile number with an SMS code, Google sign-ups too (founder, 2026-10-29). */
export default async function AddPhonePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const me = await getMe();
  const step = nextStep(me);
  if (step !== "/onboarding/phone") redirect(step);

  return (
    <PageShell
      title="אימות מספר טלפון"
      subtitle="נשלח קוד ב-SMS. דרך המספר נשלח לך עדכונים על עבודות ופניות ב-WhatsApp, והוא ישותף רק עם מי שתעבדו איתו."
    >
      <Card>
        <PhoneOtpForm mode="add" next={next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding"} />
      </Card>
    </PageShell>
  );
}
