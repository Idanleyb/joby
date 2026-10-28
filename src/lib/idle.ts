/**
 * Automatic sign-out after inactivity (founder decision 2026-10-28): 60 minutes without
 * any activity in the app ends the session and the user signs in again.
 *
 * The time of the last activity lives in a cookie so that every tab and the server agree:
 * - the browser updates it on clicks, typing, scrolling and touches (IdleWatcher);
 * - the server (src/proxy.ts) updates it on every request and signs out when it is too old.
 */
export const IDLE_MINUTES = Number(process.env.NEXT_PUBLIC_IDLE_MINUTES) || 60;
export const IDLE_MS = IDLE_MINUTES * 60_000;
export const LAST_ACTIVE_COOKIE = "joby_last_active";
/** Warn this long before signing out. */
export const IDLE_WARNING_MS = 2 * 60_000;
