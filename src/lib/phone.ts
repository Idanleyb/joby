/**
 * Israeli mobile numbers in any common format → E.164 (+9725XXXXXXXX), or null.
 * Mirrors public.normalize_il_phone() in the database.
 *   "050-123-4567", "0501234567", "+972 50 123 4567", "972501234567"
 */
export function normalizeIlPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  return /^9725\d{8}$/.test(digits) ? `+${digits}` : null;
}

/** +972501234567 → 050-123-4567 (for display) */
export function formatIlPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const local = "0" + e164.replace(/^\+?972/, "");
  return local.length === 10 ? `${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}` : e164;
}
