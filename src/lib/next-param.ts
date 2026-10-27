/** Only internal paths we expect to return to after sign-in (prevents open redirects). */
export function safeNext(raw: string | string[] | null | undefined): string | null {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return null;
  return ["/invite/", "/providers", "/provider/", "/posters/", "/account", "/admin", "/jobs", "/poster/", "/proposals", "/notifications", "/profile", "/home"].some((p) => v.startsWith(p)) ? v : null;
}
