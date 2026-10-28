import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconBriefcase, IconCheckList, IconDocHeart, IconIdCard, IconLink, IconMegaphone, IconPhone, IconSend, IconShieldCheck, IconSparkle, IconStar } from "@/components/icons";

export const metadata: Metadata = {
  title: "איך Joby עובד · Joby",
  description: "המרקטפלייס של המילואים: מי מציע שירותים, איך מצטרפים, איך עובדים הקרדיטים ואיך מגייסים.",
};

const DEFAULTS = { welcome_credits: 100, apply_cost: 10, request_cost: 2, credit_back_unopened_days: 30, job_open_days: 30, job_extension_days: 30, request_expiry_days: 7, eligibility_min_days: 30 };

async function settings() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("key, value").in("key", Object.keys(DEFAULTS));
    const out = { ...DEFAULTS };
    for (const r of data ?? []) {
      const n = Number(r.value);
      if (Number.isFinite(n)) (out as Record<string, number>)[r.key] = n;
    }
    return out;
  } catch {
    return DEFAULTS;
  }
}

type StepIcon = (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;

/** A numbered flow: each step has an icon in a tinted tile, its number on the corner, and a line to the next step. */
function Steps({ items, tone = "action" }: { items: [StepIcon, string, React.ReactNode][]; tone?: "action" | "info" }) {
  const tile = tone === "action" ? "border border-action-border bg-action" : "bg-info";
  return (
    <ol className="flex flex-col">
      {items.map(([Icon, title, body], i) => (
        <li key={title} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl ${tile}`}>
              <Icon />
              <span aria-hidden="true" className="absolute -top-1.5 -start-1.5 flex size-5 items-center justify-center rounded-full bg-brand text-[11px] font-bold text-brand-contrast ring-2 ring-surface">{i + 1}</span>
            </span>
            {i < items.length - 1 ? <span aria-hidden="true" className="my-1 w-0.5 flex-1 rounded-full bg-border" /> : null}
          </div>
          <div className={`flex flex-col gap-0.5 pt-1.5 ${i < items.length - 1 ? "pb-5" : ""}`}>
            <span className="font-bold"><span className="sr-only">שלב {i + 1}: </span>{title}</span>
            <span className="text-sm leading-relaxed text-muted">{body}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Section({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-bold tracking-wide text-foreground">{eyebrow}</span>
        <h2 className="text-xl font-bold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

export default async function HowItWorksPage() {
  const s = await settings();
  const toc: [string, string][] = [["about", "מה זה Joby"], ["providers", "נותני שירות"], ["spouses", "בני ובנות זוג"], ["credits", "קרדיטים"], ["posters", "מגייסים ומחפשי שירות"], ["feedback", "משוב ואמון"]];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-3">
        <span className="text-sm font-semibold text-foreground">איך זה עובד</span>
        <h1 className="text-[26px] font-bold leading-tight sm:text-3xl">המרקטפלייס של המילואים</h1>
        <p className="text-lg leading-relaxed text-muted">מילואימניקים מאומתים ובני ובנות הזוג שלהם מציעים שירותים — מגינון ושיפוצים ועד פיתוח תוכנה וייעוץ. כל אחד יכול לפרסם עבודה או לפנות ישירות לנותן שירות.</p>
        <nav aria-label="בעמוד הזה" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {toc.map(([id, label]) => <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold">{label}</a>)}
        </nav>
      </header>

      <Section id="about" eyebrow="מה זה Joby" title="עבודה למי ששירת, שירות למי שצריך">
        <p className="leading-relaxed">Joby מחבר בין מי שצריך עבודה או שירות לבין מילואימניקים שהקדישו זמן לשירות, ובני ובנות הזוג שלהם, שנשאו איתם בנטל. כל נותן שירות עובר אימות לפני שהפרופיל שלו גלוי.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["🎖", "נותנים שירות", `מילואימניקים עם ${s.eligibility_min_days}+ ימי מילואים מאז 7 באוקטובר 2023, ובני/בנות הזוג שלהם`],
            ["🧭", "מגייסים", "כל אחד: אדם פרטי, עסק, מגייס/ת או גוף ציבורי"],
            ["🤝", "כל תחום", "מגינון, ניקיון ושיפוצים ועד תכנות, שיווק, משפטים ופיננסים"],
          ].map(([icon, t, b], i) => (
            <div key={t} className={i === 1 ? "flex flex-col gap-1 rounded-xl bg-info p-4" : "flex flex-col gap-1 rounded-xl border border-action-border bg-action p-4"}>
              <span aria-hidden="true" className="text-2xl">{icon}</span>
              <span className="font-bold">{t}</span>
              <span className="text-sm text-muted">{b}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="providers" eyebrow="מילואימניקים" title="איך מתחילים להציע שירותים">
        <Steps items={[
          [IconPhone, "נרשמים", "עם מספר טלפון (קוד ב-SMS) או עם Google, ומאשרים את תנאי השימוש."],
          [IconShieldCheck, "מאמתים שירות מילואים", <>מעלים אישור שירות מילואים (טופס 3010) — אחד או כמה. המערכת סופרת את הימים מאז 7.10.2023, ובודק/ת מהצוות מאשר/ת תוך 24 שעות. צריך {s.eligibility_min_days} ימים לפחות. המסמכים נמחקים מיד אחרי ההחלטה.</>],
          [IconIdCard, "בונים פרופיל", "אפשר להעלות קורות חיים והפרופיל מתמלא לבד. בוחרים תחומים (ללא הגבלה), אזור עבודה או עבודה מרחוק, כותבים קצת על עצמכם ומוסיפים שירותים עם מחירים ותמונות מעבודות."],
          [IconBriefcase, "מקבלים עבודה", <>מגישים מועמדות לעבודות שמתאימות לכם ({s.apply_cost} קרדיטים), או מקבלים פניות ישירות ממפרסמים ומאשרים ({s.request_cost} קרדיטים). כשיש התאמה, נחשפים פרטי הקשר של שני הצדדים.</>],
        ]} />
        <p className="rounded-xl bg-gain p-3 text-sm">עם אישור האימות מקבלים <b>{s.welcome_credits} קרדיטים מתנה</b> — מספיק ל-{Math.floor(s.welcome_credits / s.apply_cost)} הגשות.</p>
      </Section>

      <Section id="spouses" eyebrow="בני ובנות זוג" title="בן או בת זוג של מילואימניק">
        <Steps items={[
          [IconSend, "המילואימניק/ית מזמין/ה", "מילואימניק/ית מאומת/ת שולח/ת הזמנה מעמוד החשבון (שם וטלפון). ההזמנה בתוקף 14 ימים."],
          [IconLink, "נרשמים מהקישור", "פותחים את הקישור ונרשמים בטלפון או ב-Google."],
          [IconDocHeart, "מעלים הוכחת זוגיות", "תעודת נישואין, ספח תעודת זהות שבו מופיע/ה בן/בת הזוג, או לידועים בציבור — תצהיר או מסמך רשמי. אין צורך בטופס 3010."],
          [IconSparkle, "בונים פרופיל ומתחילים", `אחרי אישור הצוות הפרופיל עולה עם תג "בן/בת זוג של מילואימניק" ו-${s.welcome_credits} קרדיטים מתנה. לכל אחד חשבון, ארנק ודירוג נפרדים.`],
        ]} tone="info" />
      </Section>

      <Section id="credits" eyebrow="קרדיטים" title="איך עובדים הקרדיטים">
        <p className="text-sm text-muted">רק נותני שירות משתמשים בקרדיטים. פרסום עבודות ופניות ישירות — חינם למגייסים.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-xl bg-gain p-4">
            <span className="text-xs font-semibold text-muted">מקבלים בהצטרפות</span>
            <span className="font-display text-2xl font-bold" dir="ltr">+{s.welcome_credits}</span>
            <span className="text-sm">מתנה עם אישור האימות</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-action-border bg-action p-4">
            <span className="text-xs font-semibold text-muted">הגשת מועמדות</span>
            <span className="font-display text-2xl font-bold" dir="ltr">−{s.apply_cost}</span>
            <span className="text-sm">= {Math.floor(s.welcome_credits / s.apply_cost)} הגשות מהמתנה</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-action-border bg-action p-4">
            <span className="text-xs font-semibold text-muted">אישור פנייה ישירה</span>
            <span className="font-display text-2xl font-bold" dir="ltr">−{s.request_cost}</span>
            <span className="text-sm">= {Math.floor(s.welcome_credits / s.request_cost)} אישורים מהמתנה</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-chip text-xs text-muted"><th className="p-3 text-start font-semibold">פעולה</th><th className="p-3 text-start font-semibold">סוג</th><th className="p-3 text-end font-semibold">קרדיטים</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {([
                ["מתנת הצטרפות, עם אישור האימות", `+${s.welcome_credits}`, "gain"],
                ["הגשת מועמדות לעבודה", `−${s.apply_cost}`, "cost"],
                ["אישור פנייה ישירה ממפרסם", `−${s.request_cost}`, "cost"],
                ["דחיית פנייה ישירה", "0", "free"],
                ["פרסום עבודה או שליחת פנייה (מגייסים)", "חינם", "free"],
              ] as const).map(([l, v, kind]) => (
                <tr key={l} className={kind === "gain" ? "bg-gain" : kind === "cost" ? "bg-action" : "bg-info"}>
                  <td className="p-3">{l}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold">
                      {kind === "gain" ? "מקבלים" : kind === "cost" ? "משלמים" : "בלי עלות"}
                    </span>
                  </td>
                  <td className="p-3 text-end font-display text-base font-bold" dir="ltr">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="font-bold">מתי הקרדיטים חוזרים</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-xl bg-gain p-4 text-sm leading-relaxed">
            <span className="self-start rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold">↩ חוזרים לכולם</span>
            <span>העבודה נסגרה <b>בלי גיוס</b> — המפרסם סגר אותה, היא פגה (אחרי {s.job_open_days} ימים, או {s.job_open_days + s.job_extension_days} עם הארכה) או שהוסרה.</span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl bg-gain p-4 text-sm leading-relaxed">
            <span className="self-start rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold">↩ חוזרים אוטומטית</span>
            <span>המפרסם <b>לא פתח</b> את המועמדות שלך {s.credit_back_unopened_days} ימים, והעבודה עדיין פתוחה.</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl bg-info p-4 text-sm leading-relaxed">
          <span className="self-start rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold">שימו לב · אין החזר</span>
          <span>כשמבטלים מועמדות בעצמכם, או אחרי שהמפרסם בחר נותן שירות לעבודה.</span>
        </div>
        <p className="text-xs text-muted">קרדיטים לא פגים, אין להם ערך כספי ואי אפשר להעביר אותם. בתקופת הבטא, לקרדיטים נוספים פונים לתמיכה; אחרי ההשקה יהיה אפשר לרכוש.</p>
      </Section>

      <Section id="posters" eyebrow="מגייסים ומחפשי שירות" title="צריכים מישהו לעבודה?">
        <Steps items={[
          [IconPhone, "נרשמים בטלפון", "קוד ב-SMS, ופרטים בסיסיים: אדם פרטי או ארגון, ועיר. אין צורך באימות מסמכים."],
          [IconMegaphone, "מפרסמים עבודה — או פונים ישירות", <>מפרסמים עבודה בחינם (פתוחה {s.job_open_days} ימים, עם אפשרות להארכה אחת), או מחפשים נותן שירות לפי תחום, אזור ודירוג ושולחים לו פנייה ישירה. נותן השירות עונה תוך {s.request_expiry_days} ימים.</>],
          [IconCheckList, "בוחרים", "רואים את המועמדים עם תגי האימות, הדירוג, ההצעה והפרופיל. אפשר לסמן לרשימה קצרה, לחשוף פרטי קשר ולבחור."],
          [IconStar, "משאירים משוב", "3 ימים אחרי ההתקשרות שני הצדדים מתבקשים לדרג. כך נבנה אמון לכולם."],
        ]} tone="info" />
        <p className="text-sm text-muted">בתחומי תכנות, שיווק דיגיטלי, עסקים, פיננסים ועורכי דין, ובכל עבודה מרחוק, צריך לציין תקציב.</p>
      </Section>

      <Section id="feedback" eyebrow="משוב ואמון" title="משוב אחרי כל עבודה">
        <ul className="flex list-disc flex-col gap-1.5 ps-5 text-sm leading-relaxed">
          <li>3 ימים אחרי שנוצר קשר עבודה, שני הצדדים מתבקשים למשוב, עם תזכורות אחרי 7 ו-14 ימים.</li>
          <li>חוות הדעת מתפרסמות יחד כששני הצדדים שלחו, או 14 ימים אחרי הראשונה — כך אף אחד לא מושפע מהשני.</li>
          <li>בלי משוב תוך 30 ימים, החשבון נחסם לפעולות חדשות עד שהמשוב נשלח. הכניסה לחשבון ממשיכה לעבוד.</li>
          <li>דירוג מוצג אחרי 3 חוות דעת לפחות.</li>
        </ul>
      </Section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-brand-contrast">הצטרפות</Link>
        <Link href="/jobs" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface px-5 font-semibold">לעבודות הפתוחות</Link>
      </div>
      <p className="text-center text-sm text-muted">שאלות? <Link href="/terms" className="underline">תנאי שימוש</Link> · <Link href="/privacy" className="underline">פרטיות</Link></p>
    </main>
  );
}
