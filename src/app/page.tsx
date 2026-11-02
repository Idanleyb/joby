import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getMe, nextStep } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";
import { getPublicRules, type PublicRules } from "@/lib/app-settings";
import { buildFaq, faqJsonLd } from "@/lib/faq";
import { HomeTabs } from "@/app/home-tabs";
import {
  IconBriefcase, IconCalculator, IconChat, IconCheckCircle, IconChevronDown, IconCode, IconGrid, IconHome, IconInfo,
  IconMegaphone, IconMusic, IconPen, IconScale, IconShieldCheck, IconStar, IconUser, IconXCircle,
} from "@/components/icons";

// Public landing page (design: "Joby — Home page" canvas, Nov 2, 2026; Upwork as the reference).
// Signed-in users with a finished sign-up go to their dashboard at /home.
export const dynamic = "force-dynamic";

type Icon = (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;

/** Icon and example line per launch category (PRD §6). Names and ids come from the database. */
const CATEGORY_META: Record<string, { icon: Icon; examples: string }> = {
  "design": { icon: IconPen, examples: "איור, וידאו, אנימציה" },
  "programming-tech": { icon: IconCode, examples: "פיתוח, דאטה, הטמעת AI" },
  "digital-marketing": { icon: IconMegaphone, examples: "תוכן, סושיאל, קמפיינים, SEO" },
  "music-audio": { icon: IconMusic, examples: "שירותי מוזיקה ואודיו" },
  "business": { icon: IconBriefcase, examples: "מכירות, אסטרטגיה, ניהול פרויקטים" },
  "finance": { icon: IconCalculator, examples: "הנהלת חשבונות" },
  "consulting": { icon: IconUser, examples: "אימון וליווי" },
  "lawyers": { icon: IconScale, examples: "שירותים משפטיים" },
  "household": { icon: IconHome, examples: "אינסטלציה, חשמל, צבע, גינון" },
  "others": { icon: IconGrid, examples: "כושר, חיות, הסעות, קייטרינג" },
};

type Category = { id: number | null; slug: string; name_he: string };

/** Fallback when the database is not reachable, so the page still renders (links then go to the unfiltered search). */
const FALLBACK_CATEGORIES: Category[] = [
  ["design", "עיצוב"], ["programming-tech", "תכנות וטכנולוגיה"], ["digital-marketing", "שיווק דיגיטלי"], ["music-audio", "מוזיקה ואודיו"],
  ["business", "עסקים"], ["finance", "פיננסים"], ["consulting", "ייעוץ"], ["lawyers", "עורכי דין"], ["household", "בית ומשק בית"], ["others", "שירותים נוספים"],
].map(([slug, name_he]) => ({ id: null, slug, name_he }));

async function getCategories(): Promise<{ connected: boolean; categories: Category[] }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return { connected: false, categories: FALLBACK_CATEGORIES };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from("categories").select("id, slug, name_he").eq("active", true).order("sort_order");
    if (error || !data?.length) return { connected: !error, categories: FALLBACK_CATEGORIES };
    return { connected: true, categories: data };
  } catch {
    return { connected: false, categories: FALLBACK_CATEGORIES };
  }
}

const sectionTitle = "font-display text-3xl font-semibold leading-tight sm:text-[40px]";
const pillDark = "inline-flex min-h-12 items-center justify-center rounded-full bg-brand px-7 font-semibold text-brand-contrast hover:bg-brand-hover";
const textLink = "self-start border-b-2 border-foreground pb-0.5 font-semibold";

function StepCards({ steps }: { steps: [string, React.ReactNode][] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(([title, body], i) => (
        <li key={title} className="flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-6 sm:p-7">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-brand font-display font-semibold text-brand-contrast">{i + 1}</span>
          <h3 className="text-xl font-semibold"><span className="sr-only">שלב {i + 1}: </span>{title}</h3>
          <p className="text-[15px] leading-relaxed text-muted">{body}</p>
        </li>
      ))}
    </ol>
  );
}

function howItWorksTabs(s: PublicRules) {
  return [
    {
      id: "reservists", label: "מילואימניקים", panel: (
        <div className="flex flex-col gap-7">
          <StepCards steps={[
            ["נרשמים", "עם מספר טלפון או חשבון Google. מאמתים טלפון ומייל בקוד, ובוחרים ״אני מציע/ה שירותים״."],
            ["מעלים טופס 3010", `מוכיחים ${s.eligibility_min_days}+ ימי מילואים מאז 7.10.2023. הצוות מחליט תוך 24 שעות, והמסמכים נמחקים מיד אחרי ההחלטה.`],
            ["בונים פרופיל", "מעלים קורות חיים והפרופיל מתמלא לבד — או ממלאים ידנית. בוחרים תחומים ואזור עבודה."],
            ["מקבלים עבודה", `מגישים מועמדות לעבודות שמתאימות לכם ומאשרים פניות ישירות ממגייסים. ${s.welcome_credits} קרדיטים מתנה מחכים לכם.`],
          ]} />
          <Link prefetch={false} href="/login" className={`${pillDark} self-start`}>הצטרפו כמילואימניקים</Link>
        </div>
      ),
    },
    {
      id: "spouses", label: "בני ובנות זוג", panel: (
        <div className="flex flex-col gap-7">
          <StepCards steps={[
            ["מקבלים הזמנה", `בן או בת הזוג המילואימניק/ית, אחרי שאומת/ה, שולח/ת לכם הזמנה. ההזמנה בתוקף ${s.spouse_invite_days} ימים.`],
            ["מאשרים את הזוגיות", "נרשמים מהקישור ומעלים תעודת נישואין, ספח תעודת זהות, או לידועים בציבור — תצהיר או מסמך רשמי. אין צורך בטופס 3010."],
            ["בונים פרופיל משלכם", "חשבון, ארנק קרדיטים ודירוג נפרדים — העבודה והמוניטין שלכם שייכים לכם."],
            ["מתחילים לעבוד", `עם האישור מקבלים תג ״בן/בת זוג של מילואימניק״ ו-${s.welcome_credits} קרדיטים מתנה, ומגישים מועמדות כמו כל נותן שירות.`],
          ]} />
          <Link prefetch={false} href="/how-it-works#spouses" className={`${pillDark} self-start`}>איך מצטרפים כבני זוג</Link>
        </div>
      ),
    },
    {
      id: "hiring", label: "מגייסים", panel: (
        <div className="flex flex-col gap-7">
          <StepCards steps={[
            ["נרשמים בדקה", "טלפון מאומת ופרטים בסיסיים — זה הכול. אנשים פרטיים, עסקים, צוותי HR וגופים ציבוריים."],
            ["מפרסמים או פונים", "מפרסמים עבודה בחינם, או מחפשים נותן שירות לפי תחום ואזור ושולחים לו פנייה ישירה."],
            ["בוחרים", "רואים מועמדים עם תגי אימות, דירוג ומרחק. מסמנים מועדפים, יוצרים קשר ומגייסים."],
            ["משאירים משוב", "אחרי העבודה שני הצדדים מדרגים זה את זה. התשלום עובר ישירות ביניכם."],
          ]} />
          <Link prefetch={false} href="/jobs/new" className={`${pillDark} self-start`}>פרסמו עבודה בחינם</Link>
        </div>
      ),
    },
  ];
}

export default async function Home() {
  const [{ connected, categories }, s] = await Promise.all([getCategories(), getPublicRules()]);
  if (connected) {
    const me = await getMe().catch(() => null);
    if (me && nextStep(me) === "/account") redirect("/home");
  }
  const faq = buildFaq(s);

  return (
    <main className="bg-surface">
      {/* Hero */}
      <section className="px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[28px] bg-brand">
          <Image
            src="/images/home-hero.jpg"
            alt="מילואימניקים בעבודה: שיפוצניק, עובדת מהבית מול מחשב ועורכת דין בפגישה"
            fill
            priority
            sizes="(min-width: 1240px) 1240px, 100vw"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-black/55" />
          <div className="relative flex min-h-[560px] max-w-[720px] flex-col justify-end gap-6 px-6 py-10 text-white sm:min-h-[600px] sm:px-14 sm:py-16">
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">עבודה אמיתית למילואימניקים ולמשפחות שלהם</h1>
            <p className="max-w-[600px] text-lg leading-relaxed sm:text-xl">מילואימניקים מאומתים ובני ובנות הזוג שלהם מציעים שירותים בכל תחום — משיפוצים ועד פיתוח. כל אחד יכול לפרסם עבודה, בחינם.</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link prefetch={false} href="/jobs" className="inline-flex min-h-[52px] items-center rounded-full bg-white px-8 text-[17px] font-bold text-black hover:bg-white/90">מצאו עבודה</Link>
              <Link prefetch={false} href="/providers" className="inline-flex min-h-[52px] items-center rounded-full border-2 border-white px-8 text-[17px] font-bold text-white hover:bg-white/10">גייסו מילואימניק</Link>
            </div>
            <p className="flex items-center gap-2 text-[15px]">
              <IconShieldCheck width={18} height={18} className="shrink-0" />
              לכל מי ששירת {s.eligibility_min_days}+ ימי מילואים מאז 7.10.2023, ולבני ובנות הזוג
            </p>
          </div>
        </div>
      </section>

      {/* What is Joby */}
      <section aria-labelledby="about-title" className="px-4 pb-20 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-12 lg:flex-row lg:items-start">
          <div className="flex flex-col gap-5 lg:flex-1">
            <span className="text-sm font-semibold text-muted">מה זה Joby?</span>
            <h2 id="about-title" className={sectionTitle}>המרקטפלייס של המילואים: מי שנתן — מקבל עבודה</h2>
            <p className="text-lg leading-relaxed text-muted">מצד אחד, מילואימניקים ששירתו לפחות {s.eligibility_min_days} יום מאז 7 באוקטובר 2023, ובני ובנות הזוג שלהם, מציעים שירותים. מצד שני, כל מי שצריך לגייס: מבעל בית שמחפש אינסטלטור ועד מנהלת גיוס שמחפשת מפתח.</p>
            <Link prefetch={false} href="/how-it-works" className={textLink}>איך Joby עובד ←</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:flex-[1.2]">
            {([
              [IconShieldCheck, "מאומתים באמת", "כל נותן שירות עובר אימות של טופס 3010 ובדיקה של הצוות, ומקבל תג על הפרופיל."],
              [IconBriefcase, "כל אחד יכול לגייס", "אנשים פרטיים, עסקים, צוותי HR ורשויות. פרסום עבודה ופנייה ישירה — בחינם."],
              [IconStar, "אמון הדדי", "אחרי כל עבודה שני הצדדים מדרגים זה את זה. הדירוגים נחשפים יחד."],
              [IconChat, "קשר ישיר, בלי תיווך", "כשיש התאמה נחשפים פרטי הקשר, וממשיכים ישירות בטלפון או ב-WhatsApp."],
            ] as [Icon, string, string][]).map(([Ico, title, body]) => (
              <div key={title} className="flex flex-col gap-2.5 rounded-[20px] border border-border bg-background p-6">
                <span className="flex size-11 items-center justify-center rounded-xl border border-border bg-surface"><Ico width={22} height={22} /></span>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" aria-labelledby="categories-title" className="scroll-mt-20 px-4 pb-24 sm:px-6">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2 id="categories-title" className={sectionTitle}>מחפשים לפי תחום</h2>
              <p className="text-lg text-muted">מגנן ועד מפתח — עשרה תחומים, ועוד מקצועות שנוספים כל הזמן.</p>
            </div>
            <Link prefetch={false} href="/providers" className={textLink}>לכל נותני השירות ←</Link>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => {
              const meta = CATEGORY_META[c.slug] ?? { icon: IconGrid, examples: "" };
              const Ico = meta.icon;
              return (
                <li key={c.slug}>
                  <Link
                    prefetch={false}
                    href={c.id ? `/providers?cat=${c.id}` : "/providers"}
                    className="flex min-h-24 items-center gap-3.5 rounded-[18px] border border-border bg-background p-5 transition hover:border-foreground"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] border border-border bg-surface"><Ico /></span>
                    <span className="flex flex-col gap-0.5">
                      <span className="font-display text-[17px] font-semibold">{c.name_he}</span>
                      {meta.examples ? <span className="text-sm text-muted">{meta.examples}</span> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="text-[15px] text-muted">לא מצאתם את התחום שלכם? בהרשמה אפשר לבחור ״אחר״ ולספר לנו — ונוסיף אותו.</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" aria-labelledby="how-title" className="scroll-mt-20 border-y border-border bg-background px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-9">
          <div className="flex flex-col gap-2">
            <h2 id="how-title" className={sectionTitle}>איך זה עובד</h2>
            <p className="text-lg text-muted">בחרו מי אתם, וראו את הדרך בארבעה צעדים.</p>
          </div>
          <HomeTabs label="איך זה עובד עבור" tabs={howItWorksTabs(s)} />
        </div>
      </section>

      {/* Credits */}
      <section id="credits" aria-labelledby="credits-title" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-9 rounded-[28px] border border-action-border bg-action px-5 py-10 sm:px-12 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-[640px] flex-col gap-2">
              <h2 id="credits-title" className={sectionTitle}>קרדיטים — איך זה עובד</h2>
              <p className="text-lg text-muted">נותני השירות משתמשים בקרדיטים כדי להגיש מועמדות ולאשר פניות. למגייסים הכול בחינם.</p>
            </div>
            <p className="flex max-w-[440px] items-start gap-2.5 rounded-2xl border border-border bg-info px-4 py-3 text-[15px] font-medium">
              <IconInfo width={20} height={20} className="mt-0.5 shrink-0" />
              כרגע השירות בחינם: הקרדיטים לא עולים כסף. נגמרו? פנו לתמיכה ונטעין לכם עוד, בלי עלות.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              [String(s.welcome_credits), "קרדיטים מתנה", "עם אישור האימות — למילואימניקים ולבני ובנות זוג"],
              [String(s.apply_cost), "הגשת מועמדות", `יורדים כשהמועמדות נשלחת. ${s.welcome_credits} קרדיטים = ${Math.floor(s.welcome_credits / s.apply_cost)} מועמדויות`],
              [String(s.request_cost), "אישור פנייה ישירה", "רק אם אישרתם. דחיית פנייה לא עולה כלום"],
              ["0", "למגייסים", "פרסום עבודות ופניות ישירות — תמיד בחינם"],
            ] as const).map(([n, title, body]) => (
              <div key={title} className="flex flex-col gap-1.5 rounded-[20px] border border-action-border bg-surface p-6 sm:p-7">
                <span className="font-display text-5xl font-bold leading-none">{n}</span>
                <span className="text-[17px] font-semibold">{title}</span>
                <span className="text-[15px] text-muted">{body}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3.5">
            <h3 className="text-[22px] font-semibold">מתי הקרדיטים חוזרים?</h3>
            <ul className="grid gap-3 md:grid-cols-3">
              <li className="flex items-start gap-3 rounded-2xl border border-action-border bg-surface px-5 py-4 text-[15px] leading-relaxed">
                <IconCheckCircle width={22} height={22} className="mt-0.5 shrink-0" />
                <span><b>המועמדות לא נפתחה {s.credit_back_unopened_days} ימים</b> והעבודה עדיין פתוחה — הקרדיטים חוזרים אוטומטית.</span>
              </li>
              <li className="flex items-start gap-3 rounded-2xl border border-action-border bg-surface px-5 py-4 text-[15px] leading-relaxed">
                <IconCheckCircle width={22} height={22} className="mt-0.5 shrink-0" />
                <span><b>העבודה נסגרה בלי גיוס</b> (או פגה אחרי עד {s.job_open_days + s.job_extension_days} ימים) — כל המועמדויות מזוכות, מלבד אלו שבוטלו.</span>
              </li>
              <li className="flex items-start gap-3 rounded-2xl border border-action-border bg-surface px-5 py-4 text-[15px] leading-relaxed">
                <IconXCircle width={22} height={22} className="mt-0.5 shrink-0 text-muted" />
                <span><b>העבודה הסתיימה בגיוס</b> — אין החזר, גם על מועמדויות שלא נפתחו. גם ביטול מועמדות לא מזוכה.</span>
              </li>
            </ul>
            <Link prefetch={false} href="/how-it-works#credits" className={`${textLink} mt-1`}>כל כללי הקרדיטים ←</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 border-t border-border bg-background px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto flex max-w-[880px] flex-col gap-7">
          <h2 id="faq-title" className={`${sectionTitle} text-center`}>שאלות נפוצות</h2>
          {faq.map(([group, items]) => (
            <div key={group} className="flex flex-col gap-3">
              <h3 className="mt-3 text-sm font-semibold text-muted">{group}</h3>
              <div className="overflow-hidden rounded-[20px] border border-border bg-surface">
                {items.map(([q, a]) => (
                  <details key={q} className="group border-b border-border last:border-b-0">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[17px] font-semibold [&::-webkit-details-marker]:hidden">
                      {q}
                      <IconChevronDown width={20} height={20} className="shrink-0 transition group-open:rotate-180" />
                    </summary>
                    <p className="px-6 pb-5 leading-relaxed text-muted">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd(faq) }} />
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-background px-4 pb-6 sm:px-6">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-7 rounded-[28px] bg-brand px-6 py-12 text-brand-contrast sm:px-12 sm:py-16">
          <div className="flex max-w-[620px] flex-col gap-2.5">
            <h2 className={sectionTitle}>הם היו שם בשבילנו. עכשיו תורנו.</h2>
            <p className="text-lg text-white/80">פרסמו עבודה או הצטרפו כנותני שירות — זה לוקח דקות.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link prefetch={false} href="/jobs" className="inline-flex min-h-[50px] items-center rounded-full bg-white px-8 font-bold text-black hover:bg-white/90">מצאו עבודה</Link>
            <Link prefetch={false} href="/providers" className="inline-flex min-h-[50px] items-center rounded-full border-2 border-white px-8 font-bold text-white hover:bg-white/10">גייסו מילואימניק</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
