import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { Card, PageShell } from "@/components/ui";
import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "ברוכים הבאים · Joby" };

export default async function WelcomePage() {
  const me = await getMe();
  const step = nextStep(me);
  if (step !== "/onboarding/welcome") redirect(step);

  return (
    <PageShell title="ברוכים הבאים ל-Joby" subtitle="עוד רגע מתחילים. כמה פרטים קצרים:">
      <Card>
        <WelcomeForm defaultName={me?.fullName ?? ""} />
      </Card>
    </PageShell>
  );
}
