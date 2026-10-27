import Link from "next/link";
import type { ReactNode } from "react";
import { WIZARD_STEPS, stepPath, type WizardSlug } from "@/lib/provider";
import { cx } from "@/components/ui";

export function WizardShell({ current, reached, title, subtitle, children }: {
  current: WizardSlug; reached: number; title: string; subtitle?: ReactNode; children: ReactNode;
}) {
  const idx = WIZARD_STEPS.findIndex((s) => s.slug === current);
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 sm:py-10">
      <nav aria-label="שלבי הפרופיל" className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>שלב {idx + 1} מתוך {WIZARD_STEPS.length}</span>
          <Link href="/account" className="underline-offset-4 hover:underline">אמשיך אחר כך</Link>
        </div>
        <ol className="flex gap-1.5">
          {WIZARD_STEPS.map((s, i) => {
            const done = s.n < reached || i < idx;
            const link = s.n <= reached;
            const bar = <span className={cx("block h-1.5 rounded-full", i === idx ? "bg-accent" : done ? "bg-brand" : "bg-border")} />;
            return (
              <li key={s.slug} className="flex-1" title={s.title}>
                {link && i !== idx ? <Link href={stepPath(s.slug)} aria-label={s.title}>{bar}</Link> : bar}
              </li>
            );
          })}
        </ol>
      </nav>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-muted">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}
