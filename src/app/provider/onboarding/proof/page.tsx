import type { Metadata } from "next";
import Link from "next/link";
import { latestVerification, reasonText, requireProvider, stepPath } from "@/lib/provider";
import { WizardShell } from "@/components/wizard-shell";
import { Card } from "@/components/ui";
import { ReservistProofForm, SpouseProofForm } from "./proof-form";

export const metadata: Metadata = { title: "אימות שירות · Joby" };

export default async function ProofStep() {
  const { me, provider } = await requireProvider();
  const v = await latestVerification(me.userId);
  const spouse = provider.provider_type === "spouse";
  const status = provider.verification_status;
  const submitted = status === "pending" || status === "approved";

  return (
    <WizardShell
      current="proof"
      reached={provider.onboarding_step}
      title={spouse ? "אישור זוגיות" : "אימות שירות מילואים"}
      subtitle={
        spouse
          ? "העלו מסמך שמראה שאתם בני זוג. הצוות בודק ידנית, והמסמך נמחק אחרי הבדיקה."
          : "העלו טופס 3010 (אישור על שירות מילואים). צריך לפחות 30 ימים מאז 7 באוקטובר 2023. המסמכים נמחקים אחרי הבדיקה — נשמרת רק התוצאה."
      }
    >
      {status === "more_info" || status === "rejected" ? (
        <p role="status" className="rounded-xl bg-info px-4 py-3 text-sm">
          {status === "more_info" ? "הבודק ביקש מידע נוסף" : "האימות הקודם נדחה"}
          {v?.decision_reason ? `: ${reasonText(v.decision_reason)}` : ""}. אפשר להעלות שוב.
        </p>
      ) : null}

      {submitted ? (
        <Card className="flex flex-col gap-3">
          <p className="text-lg font-bold">{status === "approved" ? "האימות אושר ✓" : "המסמכים התקבלו ונמצאים בבדיקה"}</p>
          <p className="text-sm text-muted">
            {status === "approved"
              ? "הפרופיל יוצג למפרסמים ברגע שתשלימו אותו."
              : "בדרך כלל תוך 24 שעות. נעדכן ב-WhatsApp ובמייל. בינתיים אפשר להמשיך לבנות את הפרופיל."}
          </p>
          <Link href={stepPath("cv")} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-contrast">
            המשך לבניית הפרופיל
          </Link>
        </Card>
      ) : spouse ? (
        <SpouseProofForm userId={me.userId} />
      ) : (
        <ReservistProofForm userId={me.userId} />
      )}
    </WizardShell>
  );
}
