/**
 * Admin "sign in as this user" (founder, 2026-11-02). While it lasts, the browser holds the
 * user's session plus this cookie: "<log id>.<expires ms>". The header shows a red banner, and
 * the proxy ends the session when the 30 minutes are over.
 */
export const IMPERSONATION_COOKIE = "joby_as";
export const IMPERSONATION_MINUTES = 30;

export function parseImpersonation(raw: string | undefined | null): { id: string; expires: number } | null {
  const m = raw?.match(/^([0-9a-f-]{36})\.(\d{10,})$/);
  return m ? { id: m[1], expires: Number(m[2]) } : null;
}
