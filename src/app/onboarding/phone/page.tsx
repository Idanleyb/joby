import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { PhoneOtpForm } from "@/components/phone-otp-form";
import { Card, PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "אימות טלפון · Joby" };

export default async function AddPhonePage() {
  const step = nextStep(await getMe());
  if (step !== "/onboarding/phone") redirect(step);

  return (
    <PageShell
      title="נשאר רק לאמת טלפון"
      subtitle="דרכו נשלח לך התראות על עבודות ופניות ב-WhatsApp, ומפרסמים יראו שהמספר מאומת."
    >
      <Card>
        <PhoneOtpForm mode="add" />
      </Card>
    </PageShell>
  );
}
