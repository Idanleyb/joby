import { expect, type Page, type BrowserContext } from "@playwright/test";

export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_KEY ?? "";
const ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY ?? "";
export const TEST_CODE = "123456";

/** Signs in with a test phone number through the UI. */
export async function signInWithPhone(page: Page, localPhone: string) {
  await page.goto("/login");
  await page.getByLabel("מספר טלפון נייד").fill(localPhone);
  await page.getByRole("button", { name: "שלחו לי קוד" }).click();
  await page.getByLabel("קוד אימות").fill(TEST_CODE);
  await page.getByRole("button", { name: "אישור" }).click();
}

/** Form error messages (ignores Next.js's hidden route announcer). */
export function formAlert(page: Page) {
  return page.locator("main").getByRole("alert");
}

export async function expectPath(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}(\\?.*)?$`));
}

/** Admin API: create a user the way Google sign-up would (email + name, no phone). */
export async function createGoogleLikeUser(email: string, fullName: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
  if (!res.ok) throw new Error(`create user failed: ${res.status} ${await res.text()}`);
}

/**
 * Puts a session for that user into the browser exactly where @supabase/ssr reads
 * it (cookie "sb-<ref>-auth-token", base64-encoded, chunked at 3180 chars).
 */
export async function injectSession(context: BrowserContext, baseURL: string, email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`password sign-in failed: ${res.status}`);
  const session = await res.json();
  const name = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0]}-auth-token`;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const chunks = value.match(/.{1,3180}/g) ?? [];
  const url = new URL(baseURL);
  await context.addCookies(
    chunks.map((v, i) => ({
      name: chunks.length === 1 ? name : `${name}.${i}`,
      value: v,
      domain: url.hostname,
      path: "/",
      sameSite: "Lax" as const,
    })),
  );
}
