import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { safeNext } from "@/lib/next-param";
import { Card, PageShell } from "@/components/ui";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "ברוכים הבאים · Joby" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const me = await getMe();
  const step = nextStep(me);
  if (step !== "/onboarding/welcome") redirect(step);

  return (
    <PageShell title="ברוכים הבאים ל-Joby" subtitle={<>עוד רגע מתחילים. כמה פרטים קצרים · <Link href="/how-it-works" target="_blank" className="underline underline-offset-4">איך Joby עובד?</Link></>}>
      <Card>
        <WelcomeForm defaultName={me?.fullName ?? ""} next={next} invited={Boolean(next?.startsWith("/invite/"))} />
      </Card>
    </PageShell>
  );
}
