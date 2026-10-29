import Link from "next/link";
import { getMe, nextStep } from "@/lib/onboarding";
import { dmy, loadFeedbackDue } from "@/lib/feedback";

/** Countdown / block banner (PRD 5.14): shown from the last reminder until feedback is submitted. */
export async function FeedbackBanner() {
  let me;
  try {
    me = await getMe();
  } catch {
    return null;
  }
  if (!me || nextStep(me) !== "/account") return null;
  const items = await loadFeedbackDue(me.userId);
  const blocked = items.find((i) => i.state === "blocked");
  const warning = items.filter((i) => i.state === "warning").sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))[0];
  if (!blocked && !warning) return null;
  return (
    <div role="alert" className={blocked ? "bg-danger text-white" : "border-b border-action-border bg-action text-foreground"}>
      <p className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
        <span>
          {blocked
            ? "החשבון חסום לפעולות חדשות (הגשה, אישור פניות, פרסום) עד שתשאירו משוב על עבודה קודמת."
            : <>השאירו משוב על &quot;{warning!.title}&quot; עד <b>{dmy(warning!.deadline!)}</b>, אחרת החשבון ייחסם לפעולות חדשות.</>}
        </span>
        <Link prefetch={false} href={`/feedback/${(blocked ?? warning)!.engagementId}`} className="rounded-lg bg-white/90 px-3 py-1 font-semibold text-foreground">להשארת משוב</Link>
      </p>
    </div>
  );
}
