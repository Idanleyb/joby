/**
 * Hebrew lifecycle emails (PRD v1.7, "Joby email content and user journeys").
 * The IDs in comments (P1.2, H3.7…) match that document.
 * Pure: everything needed is passed in `ctx`, so templates are unit-testable.
 */
import type { EmailContent } from "./layout";

export type Job = {
  id: string; title: string; city: string | null; mode: string; budget_type: string;
  budget_min: number | null; budget_max: number | null; expires_at: string; application_count: number;
  poster_id: string | null; extended: boolean;
};
export type Req = {
  id: string; title: string; city: string | null; mode: string; budget_type: string; budget_min: number | null;
  budget_max: number | null; timeline: string; description: string; poster_id: string; provider_id: string;
  expires_at: string; decline_reason: string | null;
};
export type Eng = { id: string; title: string; poster_id: string; provider_id: string; job_id: string | null };
export type Contact = { name: string; phone: string | null; email: string | null };

export type Ctx = {
  site: string;
  support: string;                         // WhatsApp link, or mailto: as a fallback
  settings: { applyCost: number; requestCost: number; welcomeCredits: number };
  user: { id: string; firstName: string; providerType: "reservist" | "spouse" | null; balance: number | null };
  jobs: Map<string, Job>;
  requests: Map<string, Req>;
  engagements: Map<string, Eng>;
  names: Map<string, string>;               // public display names (poster / provider)
  contacts: Map<string, Contact>;           // phone + email, only for events that reveal them
  stats: { openJobs: number; verifiedProviders: number };
};

type P = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));
const nis = (n: number) => `₪${n.toLocaleString("en-US")}`;

export const FREE_LINE = "בתקופה הנוכחית Joby חינמי לגמרי. הקרדיטים ניתנים במתנה ולא עולים כסף.";

export function budget(b: { budget_type: string; budget_min: number | null; budget_max: number | null }) {
  if (b.budget_type === "open_to_quotes" || b.budget_min == null) return "פתוח להצעות";
  const range = b.budget_min === b.budget_max ? nis(b.budget_min) : `${nis(b.budget_min)}–${nis(b.budget_max ?? b.budget_min)}`;
  return b.budget_type === "hourly" ? `${range} לשעה` : range;
}
const place = (x: { mode: string; city: string | null }) =>
  x.mode === "remote" ? "מרחוק" : x.mode === "both" ? `${x.city ?? ""} או מרחוק` : (x.city ?? "");
export const dmy = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Jerusalem" });
const waLink = (phone: string | null) => (phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : null);

function contactLines(c: Contact | undefined): string[] {
  if (!c) return [];
  // LRI … PDI keeps "+972…" and addresses left-to-right inside Hebrew text.
  const ltr = (v: string | null) => (v ? `\u2066${v}\u2069` : "—");
  return [`טלפון: **${ltr(c.phone)}** · מייל: **${ltr(c.email)}**`];
}
function contactButton(ctx: Ctx, c: Contact | undefined, fallback: string) {
  const wa = waLink(c?.phone ?? null);
  return wa ? { label: `לשלוח וואטסאפ ל-${c!.name}`, href: wa } : { label: "לפרטים", href: ctx.site + fallback };
}

/** Content for one outbox row, or null when this event sends no email. */
export function contentFor(event: string, p: P, ctx: Ctx): EmailContent | null {
  const u = ctx.user;
  const hi = `היי ${u.firstName || ""},`.replace(" ,", ",");
  const L = (path: string) => ctx.site + path;
  const job = ctx.jobs.get(str(p.job_id));
  const req = ctx.requests.get(str(p.request_id));
  const eng = ctx.engagements.get(str(p.engagement_id));
  const { applyCost, requestCost, welcomeCredits } = ctx.settings;

  switch (event) {
    // ---------------- Providers · P1 sign-up and verification ----------------
    case "welcome_provider":
      if (u.providerType === "spouse") return { // P1.4
        subject: `ברוכים הבאים ל-Joby, ${u.firstName}`, preheader: "עוד צעד אחד עד שהפרופיל עולה לאוויר.", greeting: hi,
        blocks: [
          "הצטרפת ל-Joby. החשבון, הפרופיל והמוניטין שלך נפרדים לגמרי.",
          "**מה נשאר:**",
          { numbered: [
            "להעלות מסמך שמאשר את הזוגיות: תעודת נישואין, ספח ת\"ז, או תצהיר נוטריוני לידועים בציבור. המסמך נמחק מיד אחרי ההחלטה.",
            "למלא פרופיל (אפשר להעלות קורות חיים ואנחנו נמלא).",
            `אחרי האישור: ${welcomeCredits} קרדיטים, והפרופיל עולה לאוויר.`,
          ] },
          FREE_LINE,
        ],
        button: { label: "להעלות את המסמך", href: L("/provider/onboarding") },
      };
      return { // P1.2
        subject: `ברוכים הבאים ל-Joby, ${u.firstName}`, preheader: "3 צעדים קצרים ואפשר להתחיל להגיש מועמדות — בחינם.", greeting: hi,
        blocks: [
          "תודה שהצטרפת ל-Joby, הזירה שמחברת בין משרתי מילואים ובני ובנות זוגם לבין אנשים שמחפשים אותם לעבודה.",
          "**נשארו 3 צעדים:**",
          { numbered: [
            "**טופס 3010**: אישור על 30 ימי מילואים לפחות מאז 7.10.2023. מורידים אותו מהאזור האישי באתר המילואים.",
            "**פרופיל**: מעלים קורות חיים ואנחנו ממלאים את רוב הפרטים.",
            `**מגישים מועמדות**: אחרי האימות (עד 24 שעות) מקבלים ${welcomeCredits} קרדיטים, שהם ${Math.floor(welcomeCredits / applyCost)} הגשות.`,
          ] },
          `**וחשוב לדעת:** ${FREE_LINE}`,
          "הצטרפת לקבוצת הבודקים הראשונה. משהו לא עובד או לא ברור? פשוט משיבים למייל הזה, אנחנו קוראים הכול.",
        ],
        button: { label: "להתחיל את הפרופיל", href: L("/provider/onboarding") },
      };

    case "verification_submitted": // P1.6
      return {
        subject: "קיבלנו את המסמכים — תשובה תוך 24 שעות", preheader: "בינתיים אפשר לסיים את הפרופיל ולעיין במשרות.", greeting: hi,
        blocks: [
          "המסמכים התקבלו ונמצאים בבדיקה. תשובה תגיע תוך 24 שעות.",
          "בינתיים אפשר לעיין במשרות ולהשלים את הפרופיל, כדי שיהיה מוכן ברגע האישור.",
          { note: "המסמכים נמחקים מהמערכת מיד אחרי ההחלטה." },
        ],
        button: { label: "להשלים את הפרופיל", href: L("/profile") },
      };

    case "verification_approved":
    case "spouse_approved_self": { // P1.7
      const badge = event === "spouse_approved_self" ? "בן/בת זוג של משרת/ת מילואים" : "משרת/ת מילואים מאומת/ת";
      const credits = num(p.credits) || welcomeCredits;
      return {
        subject: `הפרופיל אומת — ${credits} קרדיטים חינם מחכים לך`, preheader: `זה ${Math.floor(credits / applyCost)} הגשות למשרות, והפרופיל כבר באוויר.`, greeting: hi,
        blocks: [
          `מעולה! הפרופיל אומת ועלה לאוויר עם התג **${badge}**.`,
          `**קיבלת ${credits} קרדיטים:**`,
          { bullets: [
            `הגשה למשרה: ${applyCost} קרדיטים`,
            `אישור פנייה ישירה ממעסיק: ${requestCost} קרדיטים`,
            "הגשה שלא נפתחה 30 יום, או משרה שנסגרה בלי גיוס — הקרדיטים חוזרים אוטומטית",
          ] },
          FREE_LINE,
        ],
        button: { label: "לראות משרות מתאימות", href: L("/jobs") },
      };
    }

    case "verification_rejected": // P1.8
      return {
        subject: "עוד צעד קטן כדי לאמת את הפרופיל", preheader: "הסבר קצר מה חסר ואיך לתקן.", greeting: hi,
        blocks: [
          "בדקנו את המסמכים ועדיין לא הצלחנו לאשר.",
          str(p.reason) ? `**הסיבה:** ${str(p.reason)}` : "נשמח שתיצרו קשר עם התמיכה להשלמת האימות.",
          "אפשר להגיש שוב כמה פעמים שצריך. צריך עזרה? משיבים למייל הזה.",
        ],
        button: { label: "להגיש שוב", href: L("/provider/onboarding/proof") },
      };

    case "verification_more_info": // P1.9
      return {
        subject: "עוד פרט אחד ואנחנו מאשרים", preheader: str(p.reason).slice(0, 90) || "חסר לנו עוד מסמך אחד.", greeting: hi,
        blocks: [
          "כמעט סיימנו. כדי לאשר את הפרופיל חסר לנו עוד דבר אחד:",
          str(p.reason) ? `**${str(p.reason)}**` : "**מסמך נוסף**",
          "אפשר להעלות את זה בקישור. אחרי ההעלאה תגיע תשובה תוך 24 שעות.",
        ],
        button: { label: "להעלות מסמך", href: L("/provider/onboarding/proof") },
      };

    case "spouse_approved": // P1.10
      return {
        subject: "בן/בת הזוג שלך עלה/תה לאוויר ב-Joby", preheader: "תודה שהזמנת!", greeting: hi,
        blocks: ["הפרופיל של בן/בת הזוג שלך אושר ועלה לאוויר עם התג \"בן/בת זוג של משרת/ת מילואים\". תודה שהזמנת!"],
      };

    case "spouse_eligibility_decided":
      return {
        subject: "עדכון על הזכאות שלך ב-Joby", preheader: "הצוות בדק את מצב החשבון.", greeting: hi,
        blocks: [p.kept ? "בדקנו את החשבון, והזכאות שלך נשארת בתוקף. אפשר להמשיך כרגיל." : "בדקנו את החשבון, ולצערנו הזכאות כנותן/ת שירות הסתיימה. לשאלות אפשר להשיב למייל הזה."],
        button: { label: "לחשבון", href: L("/account") },
      };

    // ---------------- Providers · P2 profile completion ----------------
    case "provider_nudge": {
      const day = num(p.day);
      const resume = L("/provider/onboarding");
      if (day <= 1) return { // P2.1
        subject: `${u.firstName}, הפרופיל כמעט מוכן`, preheader: "אפשר להמשיך בדיוק מהמקום שבו עצרת.", greeting: hi,
        blocks: [
          "שמרנו את כל מה שמילאת, ונשארו רק כמה צעדים קצרים.",
          `אחרי שליחה לאימות מקבלים תשובה תוך 24 שעות, ואחריה ${welcomeCredits} קרדיטים במתנה.`,
        ],
        button: { label: "להמשיך מאיפה שעצרתי", href: resume },
      };
      if (day <= 3 && !p.proof_sent && !p.spouse) return { // P2.2a
        subject: "איך מורידים טופס 3010 בדקה אחת", preheader: "זה הצעד היחיד שחסר כדי לקבל את תג המילואימניק.", greeting: hi,
        blocks: [
          "הרבה נתקעים דווקא בשלב ה-3010, אז הנה הדרך הקצרה:",
          { numbered: [
            "נכנסים לאזור האישי באתר המילואים.",
            "מפיקים אישור שירות מצטבר מ-7.10.2023 ועד היום (או כמה טפסים לפי תקופות).",
            "מעלים ל-Joby. אנחנו סופרים את הימים בשבילך.",
          ] },
        ],
        button: { label: "להעלות טופס 3010", href: L("/provider/onboarding/proof") },
        secondary: { label: "איך זה עובד", href: L("/how-it-works") },
      };
      if (day <= 3) return { // P2.2b
        subject: "יש קורות חיים? הפרופיל מתמלא לבד", preheader: "מעלים קובץ, מאשרים וסיימת.", greeting: hi,
        blocks: [
          "מעלים קורות חיים (PDF או Word), ואנחנו ממלאים כותרת, תיאור, כישורים וניסיון. כל שדה ניתן לעריכה לפני שמאשרים.",
          "אין קורות חיים? אפשר למלא ידנית, זה לוקח כמה דקות.",
        ],
        button: { label: "להמשיך בפרופיל", href: resume },
      };
      if (day <= 7) return { // P2.3
        subject: `${ctx.stats.openJobs} משרות פתוחות מחכות למשרתי מילואים`, preheader: "מעסיקים מחפשים משרתי מילואים. חסר רק הפרופיל שלך.", greeting: hi,
        blocks: [
          `כרגע פתוחות ב-Joby **${ctx.stats.openJobs} משרות**. המפרסמים פנו לכאן כי הם רוצים לעבוד עם משרתי מילואים.`,
          "כדי להגיש צריך פרופיל מאומת, ונשארו רק כמה שלבים.",
        ],
        button: { label: "לסיים את הפרופיל", href: resume },
        secondary: { label: "לראות את המשרות", href: L("/jobs?tab=new") },
      };
      return { // P2.4
        subject: "אפשר לעזור לך לסיים?", preheader: "משיבים למייל הזה ואדם מהצוות יחזור אליך.", greeting: hi,
        blocks: [
          "ראינו שהפרופיל עדיין לא הושלם. אם משהו תקע או לא ברור, אפשר להשיב למייל הזה או לכתוב לנו בוואטסאפ ונעזור לסיים.",
          "זו התזכורת האחרונה שנשלח. הפרטים שמורים, אפשר לחזור בכל עת.",
        ],
        button: { label: "להמשיך לפרופיל", href: resume },
      };
    }

    case "profile_strength_tip": { // P2.5
      const tips = [
        p.no_photo && "להוסיף תמונת פרופיל (+10%)",
        p.no_services && "להוסיף כרטיס שירות עם מחיר (+10%)",
        p.no_cv && "להעלות קורות חיים (+10%)",
        p.no_gallery && "להוסיף תמונות מעבודות קודמות (+10%)",
      ].filter(Boolean) as string[];
      return {
        subject: "2 דקות שיעזרו למעסיקים לבחור בך", preheader: `הפרופיל ב-${num(p.pct)}%. הנה מה יקפיץ אותו.`, greeting: hi,
        blocks: ["פרופיל מלא מקבל יותר פניות ויותר תשובות להגשות. מה שחסר כרגע:", { bullets: tips.length ? tips : ["כותרת ותיאור קצר"] }],
        button: { label: "לשפר את הפרופיל", href: L("/profile") },
      };
    }

    // ---------------- Providers · P3 jobs and applications ----------------
    case "no_matches_tip": // P3.1b
      return {
        subject: "איך מקבלים יותר משרות מתאימות", preheader: "שתי הגדרות קטנות שמרחיבות את ההתאמות.", greeting: hi,
        blocks: [
          "השבוע לא עלו משרות שמתאימות בדיוק לפרופיל. שתי דרכים לקבל יותר:",
          { bullets: [
            p.radius_km ? `להרחיב את אזור העבודה (כרגע ${num(p.radius_km)} ק"מ${str(p.city) ? ` מ${str(p.city)}` : ""}), או לסמן עבודה מרחוק` : "לסמן גם עבודה מרחוק",
            "להוסיף תת-קטגוריות נוספות (אין הגבלה)",
          ] },
          "פרופיל מלא גם מופיע יותר בחיפוש של מעסיקים, שיכולים לפנות ישירות.",
        ],
        button: { label: "לעדכן תחומים ואזור", href: L("/provider/onboarding/area") },
      };

    case "first_application_nudge": // P3.2
      return {
        subject: `${welcomeCredits} קרדיטים מחכים לך. זה ${Math.floor(welcomeCredits / applyCost)} הגשות בחינם`, preheader: "משרות שמתאימות לך כבר פתוחות.", greeting: hi,
        blocks: [
          "הפרופיל מאומת והקרדיטים מחכים. משרות שמתאימות לך כבר פתוחות בפיד.",
          "טיפ: הגשה שמסבירה במשפט או שניים למה דווקא את/ה מתאים/ה מקבלת יותר תשובות.",
          `תזכורת: ${FREE_LINE}`,
        ],
        button: { label: "להגיש למשרה ראשונה", href: L("/jobs") },
      };

    case "application_sent": // P3.3
      if (!job) return null;
      return {
        subject: `ההגשה נשלחה: ${job.title}`, preheader: `נוכו ${applyCost} קרדיטים${u.balance != null ? ` · יתרה ${u.balance}` : ""}.`, greeting: hi,
        blocks: [
          `ההגשה למשרה **${job.title}**${job.poster_id && ctx.names.get(job.poster_id) ? ` של ${ctx.names.get(job.poster_id)}` : ""} נשלחה.`,
          `נוכו ${applyCost} קרדיטים.${u.balance != null ? ` יתרה: ${u.balance}.` : ""}`,
          "אם המפרסם לא יפתח את ההגשה תוך 30 יום, או שהמשרה תיסגר בלי גיוס, הקרדיטים יחזרו אוטומטית. נעדכן כשיפתחו את ההגשה או ייצרו קשר.",
        ],
        button: { label: "להצעות שלי", href: L("/proposals") },
      };

    case "applicant_contacted": { // P3.4
      const c = ctx.contacts.get(str(p.poster_id));
      const name = c?.name || "המפרסם";
      return {
        subject: `${name} רוצה לדבר על ${job?.title ?? "המשרה"}`, preheader: "הפרטים שלו בתוך המייל. כדאי לחזור מהר.", greeting: hi,
        blocks: [
          `ההגשה שלך עניינה את ${name}, והוא/היא רוצה להמשיך לשיחה.`,
          ...contactLines(c),
          "הפרטים שלך נחשפו גם אליו/ה. מומלץ להתקשר או לשלוח וואטסאפ עוד היום.",
        ],
        button: contactButton(ctx, c, "/proposals"),
      };
    }

    case "you_were_hired": { // P3.5 (also an approved extra hire)
      const posterId = eng?.poster_id ?? job?.poster_id ?? "";
      const c = ctx.contacts.get(posterId);
      const title = eng?.title ?? job?.title ?? "העבודה";
      return {
        subject: `מזל טוב! נבחרת ל-${title}`, preheader: "הפרטים של המעסיק ומה קורה עכשיו.", greeting: hi,
        blocks: [
          `${c?.name ?? "המפרסם"} בחר/ה בך לעבודה **${title}**. מזל טוב!`,
          ...contactLines(c),
          "**מה קורה עכשיו:**",
          { bullets: [
            "מסכמים ביניכם על פרטים, מחיר ותשלום. Joby לא מעורב בתשלום.",
            "בעוד 3 ימים נבקש משני הצדדים משוב קצר. הדירוג בונה את המוניטין שלך במערכת.",
          ] },
        ],
        button: contactButton(ctx, c, "/proposals?tab=hired"),
      };
    }

    case "not_selected": // P3.6
      return {
        subject: `עדכון על המשרה ${job?.title ?? ""}`.trim(), preheader: "הפעם לא, אבל יש משרות דומות פתוחות.", greeting: hi,
        blocks: [
          `הפעם המפרסם בחר במועמד/ת אחר/ת למשרה **${job?.title ?? ""}**. זה קורה, וזה לא אומר שההגשה לא הייתה טובה.`,
          "יש עכשיו משרות דומות פתוחות בפיד.",
        ],
        button: { label: "למשרות דומות", href: L("/jobs") },
      };

    case "direct_request_received": { // P3.8
      if (!req) return null;
      const poster = ctx.names.get(req.poster_id) ?? "מפרסם";
      return {
        subject: `${poster} פנה אליך: ${req.title}`, preheader: `אישור עולה ${requestCost} קרדיטים · הבקשה תקפה 7 ימים.`, greeting: hi,
        blocks: [
          `${poster} ראה את הפרופיל ופנה אליך ישירות:`,
          `**${req.title}** · ${place(req)} · ${budget(req)}`,
          req.description.length > 220 ? req.description.slice(0, 220) + "…" : req.description,
          `אישור עולה ${requestCost} קרדיטים וחושף את פרטי הקשר של שניכם. דחייה לא עולה כלום.`,
        ],
        button: { label: "לצפות בבקשה", href: L("/proposals?tab=requests") },
      };
    }

    case "request_expiring": // P3.9
      return {
        subject: `תזכורת: ${req ? ctx.names.get(req.poster_id) ?? "מפרסם" : "מפרסם"} מחכה לתשובה`, preheader: "הבקשה תפוג בעוד יומיים.", greeting: hi,
        blocks: [
          `הבקשה **${req?.title ?? ""}** תפוג ב-${dmy(str(p.expires_at) || req?.expires_at || new Date().toISOString())}. גם אם זה לא מתאים, כדאי לדחות בלחיצה. זמן התגובה מופיע בפרופיל.`,
        ],
        button: { label: "לאשר או לדחות", href: L("/proposals?tab=requests") },
      };

    case "low_credit_balance": // P3.10
      return {
        subject: `נשארו לך ${num(p.balance)} קרדיטים`, preheader: "השירות עדיין חינמי. צריך עוד? נטעין בלי עלות.", greeting: hi,
        blocks: [`נשארו לך ${num(p.balance)} קרדיטים. השירות עדיין חינמי לגמרי: צריך עוד? משיבים למייל הזה ונטעין לך קרדיטים נוספים, בלי עלות.`],
        button: { label: "לבקש קרדיטים נוספים", href: ctx.support },
      };

    case "credits_used_up": // P3.11
      return {
        subject: "ניצלת את כל הקרדיטים. נטעין לך עוד, בחינם", preheader: "בתקופה הנוכחית הקרדיטים לא עולים כסף.", greeting: hi,
        blocks: [
          `השתמשת בכל ${welcomeCredits} קרדיטי ההצטרפות. יפה מאוד!`,
          "בתקופה הנוכחית Joby חינמי לגמרי, וזה לא משתנה כשהקרדיטים נגמרים. פשוט מבקשים מאיתנו עוד ונטעין לך מחדש, בלי עלות.",
          "קרדיטים שיחזרו מהגשות שלא נפתחו ינחתו בחשבון אוטומטית.",
        ],
        button: { label: "לקבל קרדיטים נוספים", href: ctx.support },
      };

    // ---------------- Both sides · P4 feedback ----------------
    case "feedback_request":
    case "feedback_reminder": {
      const other = eng ? ctx.names.get(eng.provider_id === u.id ? eng.poster_id : eng.provider_id) ?? "הצד השני" : "הצד השני";
      const title = eng?.title ?? "העבודה";
      const href = L(`/feedback/${str(p.engagement_id)}`);
      const yes = { label: "כן, עבדנו יחד", href: `${href}?answer=yes` };
      const notYet = { label: "עוד לא", href: `${href}?answer=not_yet` };
      const no = { label: "לא יצא מזה", href: `${href}?answer=no` };
      const posterLine = eng && eng.poster_id === u.id ? ["הדירוג שלך עוזר למשרת/ת המילואים לקבל את העבודה הבאה."] : [];
      if (event === "feedback_request") return { // P4.1
        subject: `איך היה לעבוד עם ${other}?`, preheader: "שאלה אחת של כן/לא, ודירוג של דקה.", greeting: hi,
        blocks: [
          `לפני 3 ימים התחברתם דרך Joby סביב **${title}**.`,
          "הפידבק לוקח דקה. הוא עוזר למשרתי מילואים לבנות מוניטין, ולמעסיקים למצוא את האנשים הנכונים.",
          ...posterLine,
          "הביקורות עולות יחד: אף צד לא רואה מה השני כתב לפני שהגיש.",
          "**עבדתם ביחד?** לחיצה על התשובה פותחת את הטופס, עם התשובה כבר מסומנת.",
        ],
        answers: [yes, notYet, no],
      };
      if (p.final) return { // P4.3 (no block, v1.7)
        subject: `עוד דקה אחת: פידבק על ${title}`, preheader: "הדירוג שלך עוזר למשרתי מילואים ולמעסיקים לבחור בביטחון.", greeting: hi,
        blocks: [
          `זו התזכורת האחרונה לפידבק על **${title}** עם ${other}.`,
          "כל דירוג עוזר למשרתי מילואים לבנות מוניטין, ולמעסיקים למצוא את האנשים הנכונים. זה לוקח דקה.",
          "במילואים כרגע? אפשר לחזור לזה בכל זמן מרשימת הפידבק במסך הבית.",
          "**עבדתם ביחד?**",
        ],
        answers: [yes, no],
      };
      return { // P4.2
        subject: `תזכורת: פידבק על ${title}`, preheader: "דקה אחת, ואפשר גם לסמן \"עוד לא\".", greeting: hi,
        blocks: [`עדיין לא קיבלנו פידבק על העבודה עם ${other}. אם העבודה עוד לא התחילה, אפשר לסמן "עוד לא" ונשאל שוב בהמשך.`, "**עבדתם ביחד?**"],
        answers: [yes, notYet, no],
      };
    }

    case "feedback_revealed": // P4.4
      return {
        subject: "הביקורות על העבודה פורסמו", preheader: "הביקורת שקיבלת מופיעה עכשיו בפרופיל.", greeting: hi,
        blocks: [`הביקורות על **${eng?.title ?? "העבודה"}** פורסמו. מה שנכתב עליך מופיע עכשיו בפרופיל.`],
        button: { label: "לקרוא את הביקורת", href: L("/profile") },
      };

    case "reengagement": // P5
      return {
        subject: `${ctx.stats.openJobs} משרות פתוחות ב-Joby עכשיו`, preheader: "מאז הביקור האחרון עלו משרות חדשות.", greeting: hi,
        blocks: [
          `כרגע פתוחות ב-Joby ${ctx.stats.openJobs} משרות.${u.balance != null ? ` יש לך ${u.balance} קרדיטים,` : ""} והשירות עדיין חינמי לגמרי.`,
          "עסוק/ה כרגע? אפשר לעדכן זמינות ל\"עסוק עד…\" בפרופיל.",
        ],
        button: { label: "למשרות", href: L("/jobs") },
      };

    // ---------------- Posters · H1–H2 ----------------
    case "welcome_poster": // H1.2
      return {
        subject: `ברוכים הבאים ל-Joby, ${u.firstName}`, preheader: "משרתי מילואים מאומתים שמחכים לעבודה. פרסום חינם.", greeting: hi,
        blocks: [
          "תודה שבחרת להעסיק משרתי מילואים ובני ובנות הזוג שלהם. כל נותני השירות ב-Joby עברו אימות: לפחות 30 ימי מילואים מאז 7.10.2023.",
          "**שתי דרכים להתחיל:**",
          { numbered: [
            "**לפרסם משרה** — 3 דקות, ונותני שירות מתאימים מקבלים התראה ומגישים.",
            "**לפנות ישירות** — מחפשים נותני שירות לפי תחום ואזור ושולחים בקשה.",
          ] },
          "**הכול חינם:** פרסום משרות ושליחת פניות לא עולים כלום, ובתקופה הנוכחית השירות חינמי גם לנותני השירות. התשלום עצמו נסגר ישירות ביניכם.",
          "הצטרפת לקבוצת הבודקים הראשונה. משהו לא עובד? משיבים למייל הזה.",
        ],
        button: { label: "לפרסם משרה", href: L("/jobs/new") },
        secondary: { label: "לחפש נותני שירות", href: L("/providers") },
      };

    case "poster_nudge": {
      const day = num(p.day);
      if (day <= 1) return { // H2.1
        subject: "מפרסמים משרה ב-3 דקות, בחינם", preheader: "משרתי מילואים מקבלים התראה מיד כשהמשרה עולה.", greeting: hi,
        blocks: [
          "מה צריך? שרברב, מעצב/ת, מפתח/ת או רואה חשבון? מפרסמים משרה ב-7 שלבים קצרים, ונותני השירות המתאימים מקבלים התראה.",
          "המשרה פתוחה 30 יום, ואפשר להאריך ב-30 נוספים.",
        ],
        button: { label: "לפרסם משרה", href: L("/jobs/new") },
      };
      if (day <= 3) return { // H2.2
        subject: `${ctx.stats.verifiedProviders} משרתי מילואים מאומתים כבר ב-Joby`, preheader: "אפשר לדלג על הפרסום ולפנות ישירות.", greeting: hi,
        blocks: [
          "לא חייבים לפרסם משרה. אפשר לעבור על פרופילים של משרתי מילואים מאומתים, לראות דירוגים ומחירי \"החל מ-\", ולשלוח בקשה ישירה.",
        ],
        button: { label: "לחפש נותני שירות", href: L(str(p.city) ? `/providers?city=${encodeURIComponent(str(p.city))}` : "/providers") },
      };
      if (day <= 7) return { // H2.3
        subject: "אין זמן? נפרסם בשבילך", preheader: "מספרים לנו במשפט מה צריך, ואנחנו מעלים את המשרה.", greeting: hi,
        blocks: [
          "משיבים למייל הזה עם כמה מילים: מה צריך, איפה ומתי. צוות Joby ינסח ויפרסם את המשרה בשמך, ונשלח קישור לניהול שלה. נבקש את אישורך לפני שהיא עולה.",
        ],
        button: { label: "לשלוח לנו בוואטסאפ", href: ctx.support },
      };
      return { // H2.4
        subject: "נשמח לעזור למצוא את האדם הנכון", preheader: "התזכורת האחרונה שלנו.", greeting: hi,
        blocks: [
          "זו התזכורת האחרונה שנשלח. כשתצטרך/י עזרה במשימה, משרתי המילואים כאן, והפרסום יישאר חינמי.",
          "שאלה או הערה? פשוט משיבים למייל הזה.",
        ],
        button: { label: "לפרסם משרה", href: L("/jobs/new") },
      };
    }

    // ---------------- Posters · H3 matching and hiring ----------------
    case "job_published": // H3.1
      if (!job) return null;
      if (p.held) return {
        subject: `המשרה התקבלה: ${job.title}`, preheader: "היא עוברת בדיקה קצרה של הצוות.", greeting: hi,
        blocks: [`המשרה **${job.title}** התקבלה ועוברת בדיקה קצרה של הצוות. נעדכן כשהיא תעלה.`],
        button: { label: "לצפות במשרה", href: L(`/poster/jobs/${job.id}`) },
      };
      return {
        subject: `המשרה פורסמה: ${job.title}`, preheader: "נותני שירות מתאימים קיבלו התראה.", greeting: hi,
        blocks: [
          `המשרה **${job.title}** פורסמה ותהיה פתוחה עד ${dmy(job.expires_at)}. נותני שירות מתאימים קיבלו התראה.`,
          `רוצה יותר מגישים? אפשר לשתף את הקישור: ${L(`/jobs/${job.id}`)}`,
        ],
        button: { label: "לצפות במשרה", href: L(`/poster/jobs/${job.id}`) },
      };

    case "new_application": // H3.2 (first application; later ones go to the evening digest)
      if (!job) return null;
      return {
        subject: `הגשה ראשונה ל-${job.title}`, preheader: "משרת/ת מילואים מאומת/ת הגיש/ה מועמדות.", greeting: hi,
        blocks: [
          `התקבלה ההגשה הראשונה למשרה **${job.title}**.`,
          "כל מגיש/ה השקיע/ה קרדיטים כדי להגיש, אז תשובה, גם שלילית, מאוד מוערכת.",
        ],
        button: { label: "לצפות במגישים", href: L(`/poster/jobs/${job.id}/applications`) },
      };

    case "job_no_applicants": // H3.3
      if (!job) return null;
      return {
        subject: `נותני שירות שמתאימים ל-${job.title}`, preheader: "אפשר לפנות אליהם ישירות, בחינם.", greeting: hi,
        blocks: [
          `עוד לא הגיעו הגשות ל**${job.title}**. אפשר לחפש נותני שירות מאומתים בתחום ובאזור ולשלוח פנייה ישירה שמקושרת למשרה. נותן השירות מתבקש לענות תוך 7 ימים.`,
          "טיפ: משרות עם תקציב ותיאור ברור מקבלות יותר הגשות.",
        ],
        button: { label: "לשלוח פנייה ישירה", href: L(job.city ? `/providers?city=${encodeURIComponent(job.city)}` : "/providers") },
      };

    case "applications_unopened": // H3.4
      if (!job) return null;
      return {
        subject: `${num(p.count)} משרתי מילואים מחכים לתשובה על ${job.title}`, preheader: "פתיחת ההגשה מסמנת למגיש שנצפה.", greeting: hi,
        blocks: [
          `${num(p.count)} הגשות ל**${job.title}** עדיין לא נפתחו. פתיחה מסמנת למגיש/ה "נצפה", ועוזרת לו/ה לדעת אם לחכות.`,
          "מצאת כבר מישהו? אפשר לסמן \"נשכר\" או לסגור את המשרה.",
        ],
        button: { label: "לצפות בהגשות", href: L(`/poster/jobs/${job.id}/applications`) },
      };

    case "request_approved": { // H3.5
      const c = req ? ctx.contacts.get(req.provider_id) : undefined;
      const name = c?.name ?? "נותן השירות";
      return {
        subject: `${name} אישר/ה את הפנייה — הפרטים בפנים`, preheader: "אפשר ליצור קשר עכשיו.", greeting: hi,
        blocks: [
          `${name} אישר/ה את הפנייה **${req?.title ?? ""}** וישמח/תשמח לדבר.`,
          ...contactLines(c),
          "מסכמים ביניכם על פרטים ותשלום. בעוד 3 ימים נבקש משניכם פידבק קצר.",
        ],
        button: contactButton(ctx, c, "/poster/requests"),
      };
    }

    case "request_declined":
    case "request_expired": { // H3.6
      const name = req ? ctx.names.get(req.provider_id) ?? "נותן השירות" : "נותן השירות";
      const REASONS: Record<string, string> = { availability: "אין זמינות", area: "מחוץ לאזור", field: "לא בתחום שלי", budget: "תקציב", other: "אחר" };
      const reason = req?.decline_reason ? REASONS[req.decline_reason] ?? req.decline_reason : "";
      return {
        subject: `עדכון על הפנייה ל-${name}`, preheader: event === "request_expired" ? "הפנייה פגה בלי תשובה." : "הפעם זה לא הסתדר.", greeting: hi,
        blocks: [
          event === "request_expired"
            ? `הפנייה **${req?.title ?? ""}** פגה אחרי 7 ימים בלי תשובה.`
            : `${name} לא יכול/ה לקחת את **${req?.title ?? ""}** הפעם.${reason ? ` הסיבה: ${reason}.` : ""}`,
          "יש נותני שירות דומים שזמינים עכשיו.",
        ],
        button: { label: "לנותני שירות דומים", href: L("/providers") },
      };
    }

    case "hire_confirmed": { // H3.7
      const c = ctx.contacts.get(str(p.provider_id));
      const title = job?.title ?? eng?.title ?? "המשרה";
      return {
        subject: `בחרת ב-${c?.name ?? "נותן/ת שירות"} ל-${title}`, preheader: "הפרטים ומה הלאה.", greeting: hi,
        blocks: [
          `סימנת את ${c?.name ?? "נותן/ת השירות"} כמי שנבחר/ה ל**${title}**. תודה שבחרת במשרת/ת מילואים!`,
          ...contactLines(c),
          { bullets: [
            "שאר המגישים יקבלו עדכון שלא נבחרו.",
            "צריך עוד מישהו לאותה משרה? אפשר לבקש \"גיוס נוסף\" במסך המשרה.",
            "סימנת בטעות? אפשר לבטל דרך התמיכה תוך 48 שעות.",
            "בעוד 3 ימים נבקש פידבק קצר.",
          ] },
        ],
        button: contactButton(ctx, c, job ? `/poster/jobs/${job.id}` : "/poster/jobs"),
      };
    }

    case "job_expiring": // H3.8
      if (!job) return null;
      return {
        subject: `${job.title} נסגרת ב-${dmy(job.expires_at)}`, preheader: "אפשר להאריך ב-30 יום, פעם אחת.", greeting: hi,
        blocks: [
          `המשרה **${job.title}** נסגרת בעוד יומיים. עד עכשיו הגיעו ${job.application_count} הגשות.`,
          p.can_extend ? "עדיין מחפש/ת? אפשר להאריך ב-30 יום נוספים, פעם אחת. מצאת מישהו? סימון \"נשכר\" סוגר את המשרה."
                       : "מצאת מישהו? סימון \"נשכר\" סוגר את המשרה.",
        ],
        button: { label: p.can_extend ? "להאריך ב-30 יום" : "למשרה", href: L(`/poster/jobs/${job.id}`) },
      };

    case "job_closed_no_hire": // H3.9
      if (!job) return null;
      return {
        subject: `${job.title} נסגרה. מה עכשיו?`, preheader: "אפשר לפרסם מחדש או לפנות ישירות.", greeting: hi,
        blocks: [
          `המשרה **${job.title}** ${p.expired ? "פגה" : "נסגרה"} עם ${job.application_count} הגשות ובלי גיוס. הקרדיטים של המגישים הוחזרו להם.`,
          "אפשר לפרסם מחדש בלחיצה, או לפנות ישירות לנותני שירות בתחום.",
        ],
        button: { label: "לפרסם מחדש", href: L("/jobs/new") },
        secondary: { label: "לחפש נותני שירות", href: L("/providers") },
      };

    case "extra_hire_approved": // H3.10
      return {
        subject: `הגיוס הנוסף ל-${job?.title ?? "המשרה"} אושר`, preheader: "פרטי הקשר זמינים במסך המשרה.", greeting: hi,
        blocks: [`אישרנו את הגיוס הנוסף ל**${job?.title ?? "המשרה"}**. פרטי הקשר זמינים במסך המשרה.`],
        button: { label: "למשרה", href: L(job ? `/poster/jobs/${job.id}` : "/poster/jobs") },
      };

    case "extra_hire_declined":
      if (job && job.poster_id === u.id) return { // H3.10
        subject: "עדכון על בקשת הגיוס הנוסף", preheader: "הפעם לא אישרנו גיוס נוסף.", greeting: hi,
        blocks: [`הפעם לא אישרנו גיוס נוסף ל**${job.title}**. אפשר לפרסם משרה חדשה או לשלוח פנייה ישירה.`],
        button: { label: "למשרה", href: L(`/poster/jobs/${job.id}`) },
      };
      return null; // the applicant sees it in the app

    case "job_removed":
      return {
        subject: "הצוות הסיר משרה שפרסמת", preheader: "פרטים ומה אפשר לעשות.", greeting: hi,
        blocks: [
          `הצוות הסיר את המשרה **${job?.title ?? ""}**.${str(p.reason) ? ` הסיבה: ${str(p.reason)}.` : ""} הקרדיטים של המגישים הוחזרו להם.`,
          "שאלות? פשוט משיבים למייל הזה.",
        ],
        button: { label: "למשרות שלי", href: L("/poster/jobs") },
      };

    case "job_posted_on_behalf":
      if (!job) return null;
      return {
        subject: `פרסמנו בשמך: ${job.title}`, preheader: "המשרה פתוחה, ואפשר לנהל אותה מהחשבון.", greeting: hi,
        blocks: [`צוות Joby פרסם את המשרה **${job.title}** בשמך. אפשר לערוך, להאריך ולסגור אותה מהחשבון.`],
        button: { label: "למשרה", href: L(`/poster/jobs/${job.id}`) },
      };

    // ---------------- Beta and internal ----------------
    case "beta_survey": { // B1 / B2
      const url = str(p.url);
      if (!url) return null;
      if (num(p.day) >= 21) return {
        subject: "שלושה שבועות ב-Joby, איך הולך?", preheader: "עוד דקה מזמנך תעזור לנו מאוד.", greeting: hi,
        blocks: [
          "נשמח לעוד דקה מזמנך:",
          { numbered: ["מצאת עבודה או נותן שירות דרך Joby?", "עד כמה סביר שתמליץ/י על Joby לחבר? (0–10)", "מה חסר כדי שתשתמש/י בו יותר?"] },
          "ואם בא לך שיחה של 15 דקות עם הצוות, מספיק להשיב \"כן\".",
        ],
        button: { label: "לענות", href: url },
      };
      return { // B1, day 3 (founder 2026-11-03): the beta-tester Google Form
        subject: "4 דקות שיעזרו לבנות את Joby", preheader: "אתם מהבודקים הראשונים, ואנחנו רוצים לשמוע הכול.", greeting: hi,
        blocks: [
          "הצטרפת ל-Joby לפני 3 ימים, כחלק מקבוצת הבודקים הראשונה. נשמח לשמוע בכנות איך היה עד עכשיו — מה עבד, מה הפריע ומה חסר:",
          { numbered: ["ההרשמה והכניסה", "הניווט והתפריט", "כמה קל ומהיר להשתמש", "החוויה והתוכן", "האם Joby עוזר לך"] },
          "השאלון לוקח כ-4 דקות. כל תשובה נקראת על ידי הצוות. אפשר גם פשוט להשיב למייל הזה.",
        ],
        button: { label: "למלא את השאלון", href: url },
      };
    }

    case "admin_sla_alert": // O1
      return {
        subject: `⚠ ${num(p.count)} בקשות אימות קרובות ל-SLA של 24 שעות`, preheader: `הוותיקה ביותר: ${num(p.oldest_hours)} שעות.`,
        blocks: [`${num(p.count)} בקשות אימות ממתינות יותר מ-20 שעות. הוותיקה ביותר: ${num(p.oldest_hours)} שעות.`],
        button: { label: "לתור האימות", href: L("/admin/verifications") },
      };

    default:
      return null; // events with no email (in-app or WhatsApp only)
  }
}

/** P3.1 — one morning email with all new matching jobs. */
export function jobAlertDigest(jobs: Job[], ctx: Ctx): EmailContent | null {
  if (!jobs.length) return null;
  const first = jobs[0];
  return {
    subject: jobs.length === 1 ? `משרה חדשה שמתאימה לך: ${first.title}` : `${jobs.length} משרות חדשות שמתאימות לך`,
    preheader: `${first.title}${first.city ? ` · ${first.city}` : ""}${jobs.length > 1 ? " ועוד" : ""}.`,
    greeting: `היי ${ctx.user.firstName},`,
    blocks: [
      "אלה המשרות שעלו מאז אתמול ומתאימות לתחומים ולאזור שלך:",
      { bullets: jobs.slice(0, 10).map((j) => `**${j.title}** · ${place(j)} · ${budget(j)} · ${ctx.site}/jobs/${j.id}`) },
      ...(jobs.length > 10 ? [`ועוד ${jobs.length - 10} משרות בפיד.`] : []),
      ctx.user.balance != null ? `היתרה שלך: ${ctx.user.balance} קרדיטים. הגשה עולה ${ctx.settings.applyCost}.` : "",
    ].filter(Boolean),
    button: { label: "לכל המשרות המתאימות", href: `${ctx.site}/jobs` },
  };
}

/** H3.2 — evening digest of further applications, grouped by job. */
export function applicantsDigest(groups: { job: Job; count: number }[], ctx: Ctx): EmailContent | null {
  if (!groups.length) return null;
  const total = groups.reduce((s, g) => s + g.count, 0);
  const one = groups.length === 1 ? groups[0].job : null;
  return {
    subject: one ? `${total} מגישים חדשים ל-${one.title}` : `${total} מגישים חדשים למשרות שלך`,
    preheader: "כל מגיש/ה השקיע/ה קרדיטים כדי להגיש. תשובה מאוד מוערכת.",
    greeting: `היי ${ctx.user.firstName},`,
    blocks: [
      "היום הגיעו הגשות חדשות:",
      { bullets: groups.map((g) => `**${g.job.title}**: ${g.count} חדשות · ${ctx.site}/poster/jobs/${g.job.id}/applications`) },
      "כל מגיש/ה השקיע/ה קרדיטים כדי להגיש, אז תשובה, גם שלילית, מאוד מוערכת.",
    ],
    button: { label: "לצפות במגישים", href: `${ctx.site}${one ? `/poster/jobs/${one.id}/applications` : "/poster/jobs"}` },
  };
}

/** Events that never send email (in-app, WhatsApp, or sent directly by the app). */
export const NO_EMAIL = new Set([
  "application_viewed", "application_shortlisted", "credit_back_issued", "admin_invite", "admin_invite_accepted",
  "spouse_invite", "job_claim_link", "feedback_block_warning", "account_blocked_feedback", "account_unblocked",
]);

/**
 * Template ID (as in the content doc) for an outbox row, used to tag emails and
 * group the stats in /admin/emails. ASCII only (Resend tag rules): "P2.2a" → "P2_2a".
 */
export function templateId(event: string, p: P, ctx?: Pick<Ctx, "user" | "jobs">): string {
  const day = num(p.day);
  const id = (() => {
    switch (event) {
      case "welcome_provider": return ctx?.user.providerType === "spouse" ? "P1.4" : "P1.2";
      case "verification_submitted": return "P1.6";
      case "verification_approved": case "spouse_approved_self": return "P1.7";
      case "verification_rejected": return "P1.8";
      case "verification_more_info": return "P1.9";
      case "spouse_approved": return "P1.10";
      case "spouse_eligibility_decided": return "P1.11";
      case "provider_nudge": return day <= 1 ? "P2.1" : day <= 3 ? (p.proof_sent || p.spouse ? "P2.2b" : "P2.2a") : day <= 7 ? "P2.3" : "P2.4";
      case "profile_strength_tip": return "P2.5";
      case "job_alert": return "P3.1";
      case "no_matches_tip": return "P3.1b";
      case "first_application_nudge": return "P3.2";
      case "application_sent": return "P3.3";
      case "applicant_contacted": return "P3.4";
      case "you_were_hired": return "P3.5";
      case "not_selected": return "P3.6";
      case "direct_request_received": return "P3.8";
      case "request_expiring": return "P3.9";
      case "low_credit_balance": return "P3.10";
      case "credits_used_up": return "P3.11";
      case "feedback_request": return "P4.1";
      case "feedback_reminder": return p.final ? "P4.3" : "P4.2";
      case "feedback_revealed": return "P4.4";
      case "reengagement": return "P5";
      case "welcome_poster": return "H1.2";
      case "poster_nudge": return day <= 1 ? "H2.1" : day <= 3 ? "H2.2" : day <= 7 ? "H2.3" : "H2.4";
      case "job_published": return "H3.1";
      case "new_application": return Number(p.count ?? 1) > 1 ? "H3.2b" : "H3.2";
      case "job_no_applicants": return "H3.3";
      case "applications_unopened": return "H3.4";
      case "request_approved": return "H3.5";
      case "request_declined": case "request_expired": return "H3.6";
      case "hire_confirmed": return "H3.7";
      case "job_expiring": return "H3.8";
      case "job_closed_no_hire": return "H3.9";
      case "extra_hire_approved": case "extra_hire_declined": return "H3.10";
      case "job_removed": return "H3.11";
      case "job_posted_on_behalf": return "H3.12";
      case "beta_survey": return day >= 21 ? "B2" : "B1";
      case "admin_sla_alert": return "O1";
      default: return event;
    }
  })();
  return id.replace(/\./g, "_");
}

/** Hebrew names for the stats page. */
export const TEMPLATE_NAMES: Record<string, string> = {
  P1_2: "ברוכים הבאים (נותן/ת שירות)", P1_4: "ברוכים הבאים (בן/בת זוג)", P1_6: "המסמכים התקבלו", P1_7: "אומת/ה + קרדיטים",
  P1_8: "האימות נדחה", P1_9: "נדרש מסמך נוסף", P1_10: "בן/בת הזוג אושר/ה", P1_11: "עדכון זכאות",
  P2_1: "תזכורת פרופיל · יום 1", P2_2a: "תזכורת פרופיל · יום 3 (3010)", P2_2b: "תזכורת פרופיל · יום 3 (קו״ח)",
  P2_3: "תזכורת פרופיל · יום 7", P2_4: "תזכורת פרופיל · יום 14", P2_5: "חוזק פרופיל",
  P3_1: "תקציר משרות (בוקר)", P3_1b: "שבוע בלי התאמות", P3_2: "עוד לא הגשת", P3_3: "אישור הגשה", P3_4: "המפרסם יצר קשר",
  P3_5: "נבחרת לעבודה", P3_6: "לא נבחרת", P3_8: "פנייה ישירה", P3_9: "פנייה פגה בקרוב", P3_10: "מעט קרדיטים", P3_11: "הקרדיטים נגמרו",
  P4_1: "בקשת פידבק", P4_2: "תזכורת פידבק", P4_3: "תזכורת פידבק אחרונה", P4_4: "הביקורות פורסמו", P5: "חזרה לפעילות",
  H1_2: "ברוכים הבאים (מעסיק)", H2_1: "תזכורת מעסיק · יום 1", H2_2: "תזכורת מעסיק · יום 3", H2_3: "תזכורת מעסיק · יום 7",
  H2_4: "תזכורת מעסיק · יום 14", H3_1: "משרה פורסמה", H3_2: "הגשה ראשונה", H3_2b: "תקציר הגשות (ערב)",
  H3_3: "אין הגשות אחרי 72 שעות", H3_4: "הגשות שלא נפתחו", H3_5: "פנייה אושרה", H3_6: "פנייה נדחתה / פגה", H3_7: "אישור גיוס",
  H3_8: "משרה נסגרת בקרוב", H3_9: "משרה נסגרה בלי גיוס", H3_10: "גיוס נוסף", H3_11: "משרה הוסרה", H3_12: "פורסמה בשמך",
  B1: "סקר בטא · יום 3", B2: "סקר בטא · יום 21", O1: "התראת SLA לאדמינים",
};
