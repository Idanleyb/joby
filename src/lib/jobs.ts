/** Job display helpers (safe on server and client). */
export type BudgetType = "fixed" | "hourly" | "open_to_quotes";
export type WorkMode = "onsite" | "remote" | "both";

export const MODE_LABEL: Record<WorkMode, string> = { onsite: "בשטח", remote: "מרחוק", both: "בשטח או מרחוק" };
export const TIMELINE_LABEL: Record<string, string> = { asap: "דחוף", week: "תוך שבוע", month: "תוך חודש", flexible: "גמיש" };
export const JOB_STATUS_LABEL: Record<string, string> = {
  held: "בבדיקה", open: "פתוחה", hired: "נבחר נותן שירות", closed_no_hire: "נסגרה בלי גיוס", expired: "פג תוקף", removed: "הוסרה",
};
export const APP_STATUS_LABEL: Record<string, string> = {
  sent: "נשלחה", viewed: "נצפתה", shortlisted: "ברשימה הקצרה", contacted: "המפרסם יצר קשר", hired: "נבחרת! 🎉",
  not_selected: "לא נבחרת", credited_back: "הקרדיטים הוחזרו", withdrawn: "בוטלה",
};

const nis = (n: number) => `₪${n.toLocaleString("he-IL")}`;

export function budgetText(j: { budget_type: string; budget_min: number | null; budget_max: number | null }) {
  if (j.budget_type === "open_to_quotes" || j.budget_min == null) return "פתוח להצעות מחיר";
  // Left-to-right isolate (U+2066…U+2069) so "₪1,500–₪2,500" is not reversed inside Hebrew text.
  const range = j.budget_min === j.budget_max ? nis(j.budget_min) : `\u2066${nis(j.budget_min)}–${nis(j.budget_max!)}\u2069`;
  return j.budget_type === "hourly" ? `${range} לשעה` : range;
}

export function placeText(j: { mode: string; city: string | null }) {
  if (j.mode === "remote") return "מרחוק";
  return j.mode === "both" ? `${j.city ?? ""} · או מרחוק` : j.city ?? "";
}

/** PRD 5.9: applicants shown as a range. */
export function applicantRange(n: number) {
  if (n < 5) return "0–4 מועמדים";
  if (n < 10) return "5–9 מועמדים";
  if (n < 20) return "10–19 מועמדים";
  return "20+ מועמדים";
}

export function timeAgo(iso: string, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return m <= 1 ? "עכשיו" : `לפני ${m} דקות`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "לפני שעה" : `לפני ${h} שעות`;
  const d = Math.floor(h / 24);
  return d === 1 ? "אתמול" : `לפני ${d} ימים`;
}

export function daysLeft(iso: string, now = Date.now()) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));
}

/** Rough area matching until we have coordinates: same city, or the same region for 25/50 km. */
const REGION: Record<string, string> = {
  "תל אביב-יפו": "center", "רמת גן": "center", "גבעתיים": "center", "בני ברק": "center", "חולון": "center", "בת ים": "center",
  "ראשון לציון": "center", "פתח תקווה": "center", "אור יהודה": "center", "יהוד-מונוסון": "center", "ראש העין": "center",
  "הרצליה": "sharon", "רעננה": "sharon", "כפר סבא": "sharon", "הוד השרון": "sharon", "נתניה": "sharon", "חדרה": "sharon", "זכרון יעקב": "sharon",
  "ירושלים": "jerusalem", "בית שמש": "jerusalem", "מעלה אדומים": "jerusalem", "מודיעין-מכבים-רעות": "jerusalem",
  "רחובות": "shfela", "נס ציונה": "shfela", "יבנה": "shfela", "גדרה": "shfela", "לוד": "shfela", "רמלה": "shfela", "אשדוד": "shfela", "אלעד": "shfela",
  "חיפה": "north", "קריית אתא": "north", "קריית ביאליק": "north", "קריית מוצקין": "north", "נהריה": "north", "כרמיאל": "north",
  "עפולה": "north", "נצרת": "north", "טבריה": "north", "צפת": "north", "קריית שמונה": "north",
  "באר שבע": "south", "אשקלון": "south", "קריית גת": "south", "שדרות": "south", "נתיבות": "south", "אופקים": "south", "דימונה": "south", "אילת": "south",
  "אריאל": "samaria",
};
const sameArea = (a: string | null, b: string | null) => !!a && !!b && (a === b || (!!REGION[a] && REGION[a] === REGION[b]));

export function jobMatchesProvider(
  job: { mode: string; city: string | null; subcategory_id: number },
  p: { works_onsite: boolean; works_remote: boolean; city: string | null; radius_km: number | null; subs: number[] },
) {
  if (!p.subs.includes(job.subcategory_id)) return false;
  if (job.mode !== "onsite" && p.works_remote) return true;
  if (job.mode === "remote" || !p.works_onsite) return false;
  if (p.radius_km == null) return true; // nationwide
  return p.radius_km === 10 ? job.city === p.city : sameArea(job.city, p.city);
}
