/** In-app text and link for each notification event (the outbox rows written by the database). */
type P = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");

export function notificationText(event: string, p: P): { text: string; href?: string; icon: string } {
  const job = s(p.job_id);
  switch (event) {
    case "job_alert": return { icon: "🔔", text: `עבודה חדשה שמתאימה לך: ${s(p.title)}`, href: `/jobs/${job}` };
    case "application_viewed": return { icon: "👀", text: "המפרסם צפה במועמדות שלך", href: `/jobs/${job}` };
    case "applicant_contacted": return { icon: "📞", text: "המפרסם רוצה ליצור איתך קשר — פרטי הקשר זמינים", href: "/proposals" };
    case "you_were_hired": return { icon: "🎉", text: "נבחרת לעבודה!", href: "/proposals?tab=hired" };
    case "not_selected": return { icon: "•", text: "המפרסם בחר נותן שירות אחר לעבודה", href: `/jobs/${job}` };
    case "credit_back_issued": return { icon: "↩", text: `${s(String(p.credits ?? ""))} קרדיטים הוחזרו אליך`, href: "/provider/credits" };
    case "low_credit_balance": return { icon: "⚠", text: `נשארו לך ${String(p.balance ?? "")} קרדיטים`, href: "/provider/credits" };
    case "new_application": return { icon: "📥", text: `מועמד/ת חדש/ה לעבודה שלך (סה״כ ${String(p.count ?? "")})`, href: `/poster/jobs/${job}` };
    case "job_expiring": return { icon: "⏳", text: "העבודה שלך נסגרת בעוד יומיים — אפשר להאריך", href: `/poster/jobs/${job}` };
    case "job_removed": return { icon: "⚠", text: "הצוות הסיר עבודה שפרסמת", href: "/poster/jobs" };
    case "job_posted_on_behalf": return { icon: "📄", text: "צוות Joby פרסם עבודה בשמך", href: `/poster/jobs/${job}` };
    case "extra_hire_approved": return { icon: "✓", text: "הבקשה לגיוס נוסף אושרה", href: `/poster/jobs/${job}` };
    case "extra_hire_declined": return { icon: "•", text: "הבקשה לגיוס נוסף לא אושרה", href: `/poster/jobs/${job}` };
    case "verification_submitted": return { icon: "📄", text: "קיבלנו את המסמכים. האימות בבדיקה (עד 24 שעות)", href: "/account" };
    case "verification_approved": return { icon: "✓", text: "האימות אושר! הפרופיל שלך גלוי וקיבלת קרדיטים", href: "/profile" };
    case "spouse_approved_self": return { icon: "✓", text: "האימות אושר! הפרופיל שלך גלוי", href: "/profile" };
    case "verification_rejected": return { icon: "✕", text: "האימות לא אושר — אפשר להעלות שוב", href: "/provider/onboarding/proof" };
    case "verification_more_info": return { icon: "?", text: "הבודק צריך מידע נוסף לאימות", href: "/provider/onboarding/proof" };
    case "spouse_approved": return { icon: "✓", text: "בן/בת הזוג שלך אומת/ה", href: "/account" };
    case "spouse_eligibility_decided": return { icon: "•", text: "עודכן מצב הזכאות של בן/בת הזוג", href: "/account" };
    case "direct_request_received": return { icon: "📨", text: "קיבלת פנייה ישירה ממפרסם", href: "/proposals?tab=requests" };
    case "request_approved": return { icon: "✓", text: "נותן השירות אישר את הפנייה שלך — פרטי הקשר זמינים", href: "/poster/requests" };
    case "request_declined": return { icon: "•", text: "נותן השירות לא יכול לקבל את הפנייה", href: "/poster/requests" };
    case "request_expired": return { icon: "⏳", text: "פנייה ישירה פגה בלי מענה", href: "/poster/requests" };
    case "feedback_request": return { icon: "★", text: "איך היה? נשמח למשוב קצר על העבודה", href: `/feedback/${s(p.engagement_id)}` };
    case "feedback_reminder": return { icon: "★", text: "תזכורת: משוב על עבודה שהסתיימה", href: "/feedback" };
    case "feedback_block_warning": return { icon: "⚠", text: "בלי משוב, החשבון ייחסם לפעולות חדשות בקרוב", href: "/feedback" };
    case "account_blocked_feedback": return { icon: "⛔", text: "החשבון חסום לפעולות חדשות עד שתשאירו משוב", href: "/feedback" };
    case "account_unblocked": return { icon: "✓", text: "תודה על המשוב! החשבון פעיל שוב", href: "/home" };
    case "feedback_revealed": return { icon: "★", text: "חוות הדעת על העבודה פורסמו", href: "/profile" };
    default: return { icon: "•", text: "עדכון מ-Joby" };
  }
}
