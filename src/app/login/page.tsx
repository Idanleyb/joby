import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/onboarding";
import { PhoneOtpForm } from "@/components/phone-otp-form";
import { GoogleButton } from "@/components/google-button";
import { Card, PageShell } from "@/components/ui";

export const metadata: Metadata = { title: "כניסה · Joby" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getMe()) redirect("/onboarding");
  const { error } = await searchParams;

  return (
    <PageShell title="כניסה או הרשמה" subtitle="משתמשים חדשים וקיימים נכנסים באותה דרך.">
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          הכניסה עם Google לא הושלמה. נסו שוב או היכנסו עם מספר טלפון.
        </p>
      ) : null}
      <Card>
        <PhoneOtpForm mode="signin" />
      </Card>
      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-border" />
        או
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton />
      <p className="text-center text-xs text-muted">
        בהמשך את/ה מאשר/ת את <Link href="/terms" className="underline">תנאי השימוש</Link> ואת{" "}
        <Link href="/privacy" className="underline">מדיניות הפרטיות</Link>.
      </p>
    </PageShell>
  );
}
