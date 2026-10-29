/**
 * Business-rule errors raised by the database (public.raise_app_error) arrive
 * as the error message, e.g. "insufficient_credits". Map them to Hebrew UI text.
 * Keep in sync with the codes in supabase/migrations (grep raise_app_error).
 */
export const APP_ERRORS: Record<string, string> = {
  account_suspended: "החשבון מושעה. פנו לתמיכה.",
  already_applied: "כבר הגשת מועמדות לעבודה הזו.",
  already_decided: "הבקשה כבר טופלה.",
  already_provider: "כבר יש לך פרופיל נותן שירות.",
  already_requested: "כבר נשלחה בקשה כזו.",
  already_verified: "החשבון כבר מאומת.",
  answer_required: "יש לבחור כן או לא.",
  applicant_cap_reached: "העבודה הזו כבר לא מקבלת מועמדויות.",
  below_threshold: "פחות מ-30 ימי מילואים מאז 7 באוקטובר 2023.",
  blocked: "לא ניתן לבצע את הפעולה מול משתמש זה.",
  budget_required: "בעבודה מסוג זה חובה לציין תקציב.",
  budget_too_low: "התקציב המינימלי הוא 50 ₪.",
  cannot_extend: "לא ניתן להאריך את העבודה הזו.",
  city_required: "יש לציין עיר.",
  company_required: "יש לציין שם חברה.",
  daily_request_limit: "הגעת למספר הפניות היומי המרבי.",
  feedback_already_submitted: "כבר השארת משוב.",
  demo_mismatch: "זה תוכן דמו להמחשה. רק חשבונות דמו יכולים לפעול עליו.",
  feedback_blocked: "החשבון חסום עד שתשאירו משוב על עבודה קודמת.",
  insufficient_credits: "אין מספיק קרדיטים.",
  invalid_budget: "טווח התקציב אינו תקין.",
  invalid_claim: "הקישור אינו תקף.",
  invalid_decision: "החלטה לא תקינה.",
  invalid_file_count: "יש להעלות בין קובץ אחד ל-15 קבצים.",
  invalid_job: "העבודה לא נמצאה.",
  invalid_phone: "מספר הטלפון אינו תקין.",
  invalid_service_card: "כרטיס השירות לא נמצא.",
  invalid_state: "לא ניתן לבצע את הפעולה במצב הנוכחי.",
  invalid_subcategory: "יש לבחור תחום.",
  invite_expired: "תוקף ההזמנה פג.",
  invite_invalid: "ההזמנה אינה תקפה.",
  job_already_hired: "כבר נבחר נותן שירות לעבודה הזו. אפשר לבקש גיוס נוסף.",
  job_locked_after_applications: "אחרי שהתקבלו מועמדויות אי אפשר לשנות תחום או תקציב.",
  job_not_editable: "לא ניתן לערוך את העבודה הזו.",
  job_not_open: "העבודה כבר לא פתוחה.",
  limit_reached: "הגעת למספר המרבי.",
  name_locked: "לא ניתן לשנות שם אחרי האימות. פנו לתמיכה.",
  name_required: "יש להזין שם מלא.",
  not_authorized: "אין הרשאה.",
  not_found: "לא נמצא.",
  not_signed_in: "יש להתחבר.",
  not_verified: "יש להשלים אימות לפני הפעולה הזו.",
  not_verified_reservist: "רק מילואימניק מאומת יכול להזמין בן או בת זוג.",
  open_jobs_limit: "הגעת למספר העבודות הפתוחות המרבי (10).",
  overall_required: "יש לתת דירוג כללי.",
  own_job: "אי אפשר להגיש מועמדות לעבודה שפרסמת.",
  own_profile: "אי אפשר לפנות לעצמך.",
  phone_not_verified: "יש לאמת מספר טלפון.",
  phone_required: "יש להוסיף מספר טלפון נייד.",
  phone_taken: "המספר הזה כבר רשום לחשבון אחר. התנתקו והיכנסו עם קוד SMS למספר הזה.",
  poster_profile_required: "יש להשלים פרופיל מפרסם.",
  profile_missing: "הפרופיל לא נמצא.",
  protected_field: "לא ניתן לשנות שדה זה.",
  provider_missing: "פרופיל נותן השירות לא נמצא.",
  provider_unavailable: "נותן השירות אינו זמין.",
  reason_required: "יש לציין סיבה.",
  request_already_open: "כבר יש פנייה פתוחה לנותן שירות זה.",
  request_not_pending: "הפנייה כבר לא ממתינה לתשובה.",
  reservist_not_verified: "המילואימניק המקושר עדיין לא מאומת.",
  reversal_window_passed: "חלפו 48 השעות לביטול.",
  spouse_link_exists: "כבר קיימת הזמנה או קישור לבן/בת זוג.",
  spouse_link_missing: "לא נמצא קישור לבן/בת זוג.",
  already_admin: "למשתמש עם המייל הזה כבר יש הרשאת ניהול.",
  cannot_remove_self: "אי אפשר להסיר את ההרשאה של עצמך.",
  invalid_email: "כתובת המייל אינה תקינה.",
  invite_used: "ההזמנה כבר אושרה או בוטלה.",
  email_taken: "המייל הזה כבר מאומת בחשבון אחר.",
  code_too_soon: "אפשר לבקש קוד חדש בעוד חצי דקה.",
  too_many_codes: "נשלחו יותר מדי קודים. נסו שוב בעוד שעה.",
  code_attempts: "יותר מדי ניסיונות. בקשו קוד חדש.",
  code_expired: "תוקף הקוד פג. בקשו קוד חדש.",
  code_invalid: "הקוד שגוי. נסו שוב או בקשו קוד חדש.",
  email_not_verified: "יש לאמת כתובת מייל.",
  invite_email_mismatch: "ההזמנה נשלחה לכתובת מייל אחרת. היכנסו עם החשבון שהמייל הזה מאומת בו.",
};

export function appErrorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message ?? "";
  return APP_ERRORS[code] ?? "משהו השתבש. נסו שוב.";
}

/** Supabase Auth errors (sign-in, codes, phone change) → Hebrew. */
export function authErrorMessage(error: { code?: string; message?: string; status?: number } | null | undefined): string {
  const code = error?.code ?? "";
  const msg = (error?.message ?? "").toLowerCase();
  if (code === "otp_expired" || msg.includes("token has expired") || msg.includes("invalid")) {
    if (msg.includes("phone")) return "מספר הטלפון אינו תקין.";
    return "הקוד שגוי או שפג תוקפו. נסו שוב או בקשו קוד חדש.";
  }
  if (code === "phone_exists" || msg.includes("already been registered")) {
    return "המספר הזה כבר רשום לחשבון אחר. התנתקו והתחברו עם קוד SMS למספר הזה.";
  }
  if (code.startsWith("over_") || error?.status === 429 || msg.includes("rate limit") || msg.includes("security purposes")) {
    return "יותר מדי ניסיונות. המתינו מעט ונסו שוב.";
  }
  if (code === "sms_send_failed" || msg.includes("sms")) return "לא הצלחנו לשלוח SMS. בדקו את המספר ונסו שוב.";
  if (code === "provider_disabled") return "שיטת הכניסה הזו אינה זמינה כרגע.";
  return "משהו השתבש. נסו שוב.";
}
