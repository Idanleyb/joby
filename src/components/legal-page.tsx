import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_UPDATED, SUPPORT_EMAIL } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** Long-form legal page: title, update date, draft note, table of contents and numbered sections. */
export function LegalPage({ eyebrow, title, intro, sections, other }: {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
  other: { href: string; label: string };
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-3">
        <span className="text-sm font-semibold">{eyebrow}</span>
        <h1 className="text-[26px] font-bold leading-tight sm:text-3xl">{title}</h1>
        <p className="text-sm text-muted">עודכן לאחרונה: {LEGAL_UPDATED}</p>
        <p className="rounded-xl bg-info p-3 text-sm leading-relaxed">
          Joby נמצא בתקופת בטא. זהו נוסח ראשון שיעבור בדיקה משפטית לפני פתיחת הבטא, וייתכנו בו עדכונים. שינוי מהותי נודיע לכם מראש.
        </p>
        <div className="leading-relaxed">{intro}</div>
      </header>

      <nav aria-label="תוכן העניינים" className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="mb-2 text-sm font-bold">תוכן העניינים</h2>
        <ol className="grid gap-1 text-sm sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.id}><a href={`#${s.id}`} className="underline-offset-4 hover:underline">{i + 1}. {s.title}</a></li>
          ))}
        </ol>
      </nav>

      {sections.map((s, i) => (
        <section key={s.id} id={s.id} className="flex scroll-mt-20 flex-col gap-3 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="text-xl font-bold">{i + 1}. {s.title}</h2>
          <div className="flex flex-col gap-3 leading-relaxed">{s.body}</div>
        </section>
      ))}

      <p className="text-center text-sm text-muted">
        שאלות? כתבו ל-<a href={`mailto:${SUPPORT_EMAIL}`} className="underline" dir="ltr">{SUPPORT_EMAIL}</a> ·{" "}
        <Link prefetch={false} href={other.href} className="underline">{other.label}</Link> ·{" "}
        <Link prefetch={false} href="/how-it-works" className="underline">איך Joby עובד</Link>
      </p>
    </main>
  );
}

/** Bulleted list in the legal body style. */
export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 ps-5">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}
