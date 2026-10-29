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
    <PageShell title={me?.termsAccepted ? "השלמת פרטים" : "ברוכים הבאים ל-Joby"} subtitle={me?.termsAccepted ? "שם פרטי ושם משפחה בנפרד — זה כל מה שחסר." : <>עוד רגע מתחילים. כמה פרטים קצרים · <Link href="/how-it-works" target="_blank" className="underline underline-offset-4">איך Joby עובד?</Link></>}>
      <Card>
        <WelcomeForm defaultFirst={me?.firstName ?? me?.fullName?.split(" ")[0] ?? ""} defaultLast={me?.lastName ?? me?.fullName?.split(" ").slice(1).join(" ") ?? ""} next={next}
          returning={me?.termsAccepted} invited={next?.startsWith("/invite/admin/") ? "admin" : next?.startsWith("/invite/") ? "spouse" : undefined} />
      </Card>
    </PageShell>
  );
}
