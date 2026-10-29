import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { Card, PageShell } from "@/components/ui";
import { PosterForm } from "./poster-form";

export const metadata: Metadata = { title: "פרטי מפרסם · Joby" };

export default async function PosterOnboardingPage() {
  const me = await getMe();
  const step = nextStep(me);
  // Also reachable from the account page to add the poster role later.
  if (step !== "/onboarding/poster" && !(step === "/account" && me && !me.hasPosterProfile)) redirect(step);

  return (
    <PageShell title="פרטי המפרסם" subtitle="פרסום עבודות ב-Joby חינמי. אין צורך באימות מסמכים — רק טלפון נייד.">
      <Card>
        <PosterForm />
      </Card>
    </PageShell>
  );
}
