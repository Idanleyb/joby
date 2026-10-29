import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { safeNext } from "@/lib/next-param";
import { Card, PageShell } from "@/components/ui";
import { EmailCodeForm } from "./email-code-form";

export const metadata: Metadata = { title: "מייל · Joby" };

/** Every account confirms an email with a code (founder, 2026-10-29). Google sign-ups skip this step. */
export default async function EmailPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const me = await getMe();
  const step = nextStep(me);
  if (step !== "/onboarding/email") redirect(step);

  return (
    <PageShell title="אימות כתובת מייל" subtitle="נשתמש בה לעדכונים חשובים על החשבון, ולקבלות כשתהיה אפשרות לרכוש קרדיטים.">
      <Card>
        <EmailCodeForm defaultEmail={me?.email ?? ""} next={next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding"} />
      </Card>
    </PageShell>
  );
}
