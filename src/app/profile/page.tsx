import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { getMode } from "@/lib/mode";
import { stepPath } from "@/lib/provider";
import { loadProviderView } from "@/lib/provider-view";
import { loadPosterView } from "@/lib/poster-view";
import { strengthWithTips } from "@/lib/strength";
import { ProviderProfile } from "@/components/provider-profile";
import { PosterProfile } from "@/components/poster-profile";
import { Card } from "@/components/ui";
import { AvailabilityForm } from "./availability-form";
import { GalleryEditor } from "./gallery-editor";

export const metadata: Metadata = { title: "הפרופיל שלי · Joby" };

const chip = "inline-flex min-h-10 items-center rounded-xl border border-border bg-surface px-3 text-sm font-semibold hover:bg-background";

export default async function MyProfilePage() {
  const me = await getMe();
  if (!me || nextStep(me) !== "/account") redirect(nextStep(me));
  const mode = await getMode(me);

  if (mode === "hire") {
    const p = await loadPosterView(me.userId);
    if (!p) redirect("/onboarding/poster");
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-[26px] font-bold">הפרופיל שלי כמפרסם/ת</h1>
          <Link href="/profile/edit" className={chip}>עריכה</Link>
        </div>
        {!p.about ? <p className="rounded-xl bg-info p-3 text-sm">טיפ: הוסיפו כמה מילים עליכם — נותני שירות מגישים יותר למפרסמים שהם מכירים. <Link href="/profile/edit" className="underline">להוספה</Link></p> : null}
        <Card><PosterProfile p={p} /></Card>
      </main>
    );
  }

  const p = await loadProviderView(me.userId);
  if (!p) redirect("/account");
  const { value, tips } = strengthWithTips(p);
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[26px] font-bold">הפרופיל שלי</h1>
        <Link href={`/providers/${me.userId}`} className="text-sm underline underline-offset-4">איך אחרים רואים אותי</Link>
      </div>

      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">חוזק הפרופיל</h2>
          <span className="text-xl font-bold">{value}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-background" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="חוזק הפרופיל">
          <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
        </div>
        {tips.length ? (
          <ul className="flex flex-col gap-1 text-sm">
            {tips.slice(0, 3).map((t) => (
              <li key={t.label}><Link href={t.href} className="underline underline-offset-4">הוספת {t.label}</Link> <span className="text-muted">+{t.gain}%</span></li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">הפרופיל מלא. כל הכבוד!</p>}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">זמינות</h2>
        <AvailabilityForm availability={p.availability} busyUntil={p.busy_until} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 id="gallery" className="font-bold">תמונות מעבודות</h2>
        <GalleryEditor userId={me.userId} initial={p.gallery} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">עריכה</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={stepPath("about")} className={chip}>כותרת ותיאור</Link>
          <Link href={stepPath("categories")} className={chip}>תחומים ומיומנויות</Link>
          <Link href={stepPath("area")} className={chip}>אזור עבודה</Link>
          <Link href={stepPath("services")} className={chip}>שירותים ומחירים</Link>
          <Link href={stepPath("cv")} className={chip}>קורות חיים</Link>
          <Link href={stepPath("photo")} className={chip}>תמונה</Link>
        </div>
      </Card>

      <Card><ProviderProfile p={p} /></Card>
    </main>
  );
}
