import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { dmy, loadFeedbackDue } from "@/lib/feedback";
import { PageShell, cx } from "@/components/ui";

export const metadata: Metadata = { title: "משובים · Joby" };

const STATE: Record<string, [string, string]> = {
  blocked: ["החשבון חסום עד המשוב", "bg-danger-bg text-danger"],
  warning: ["דחוף", "border border-action-border bg-action font-bold text-foreground"],
  due: ["ממתין למשוב", "bg-action text-foreground"],
  early: ["אפשר כבר עכשיו", "bg-background text-muted"],
};
const DONE: Record<string, string> = {
  yes: "תודה! חוות הדעת תתפרסם כששני הצדדים ישלחו, או בעוד 14 ימים.",
  no: "תודה, רשמנו. התשובה לא מוצגת לאף אחד.",
  not_yet: "בסדר, נשאל שוב בתזכורת הבאה.",
};

export default async function FeedbackListPage({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const me = await getMe();
  if (!me) redirect("/login?next=/feedback");
  if (nextStep(me) !== "/account") redirect(nextStep(me));
  const { done } = await searchParams;
  const items = await loadFeedbackDue(me.userId);
  return (
    <PageShell title="משובים" subtitle="אחרי כל עבודה, שני הצדדים משאירים משוב. כך נבנה אמון במרקטפלייס.">
      {done && DONE[done] ? <p role="status" className="rounded-xl bg-info px-4 py-3 text-sm">{DONE[done]}</p> : null}
      {!items.length ? <p className="rounded-2xl bg-background p-6 text-center text-muted">אין משובים פתוחים.</p> : null}
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.engagementId}>
            <Link prefetch={false} href={`/feedback/${i.engagementId}`} className="flex flex-col gap-1.5 rounded-2xl border border-border bg-surface p-4 hover:bg-background">
              <div className="flex items-start justify-between gap-3">
                <span className="font-bold">{i.title}</span>
                <span className={cx("shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold", STATE[i.state][1])}>{STATE[i.state][0]}</span>
              </div>
              <span className="text-sm text-muted">
                {i.iAmPoster ? "נותן/ת השירות" : "המפרסם/ת"}: <bdi>{i.otherName}</bdi> · מ-{dmy(i.createdAt)}
                {i.deadline && i.state !== "blocked" ? ` · עד ${dmy(i.deadline)}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
