import { expect, type Page, type BrowserContext } from "@playwright/test";

export const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_KEY ?? "";
const ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY ?? "";
export const TEST_CODE = "123456";

/** Signs in with a test phone number through the UI. */
export async function signInWithPhone(page: Page, localPhone: string) {
  await page.goto("/login");
  await enterPhoneAndCode(page, localPhone);
}

/** Phone + code on the current page (keeps ?next= on the login URL). */
export async function enterPhoneAndCode(page: Page, localPhone: string) {
  await page.getByLabel("מספר טלפון נייד").fill(localPhone);
  await page.getByRole("button", { name: "שלחו לי קוד" }).click();
  await page.getByLabel("קוד אימות").fill(TEST_CODE);
  await page.getByRole("button", { name: "אישור" }).click();
  // Wait until sign-in has navigated on (to onboarding, the account, or the requested page).
  await page.waitForURL((u) => !u.pathname.startsWith("/login") && !u.pathname.startsWith("/onboarding/phone") && u.pathname !== "/onboarding");
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

/** Service-role REST call (test setup only). */
export async function serviceRest(path: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "content-type": "application/json", Prefer: "return=representation", ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}

export async function userIdByPhone(e164: string): Promise<string> {
  const rows = await serviceRest(`profiles?select=id&phone=eq.${encodeURIComponent(e164)}`);
  if (!rows?.[0]) throw new Error(`no profile for ${e164}`);
  return rows[0].id;
}

export async function storageExists(bucket: string, path: string) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.ok;
}

/** Tiny valid files for upload tests. */
export const PDF = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

/** Welcome screen: name, roles, terms. */
export async function completeWelcome(page: Page, name: string, roles: ("provider" | "poster")[]) {
  await page.getByLabel("שם מלא").fill(name);
  if (roles.includes("provider")) await page.getByText("להציע שירותים", { exact: true }).click();
  if (roles.includes("poster")) await page.getByText("לפרסם עבודות ולגייס").click();
  await page.getByText("קראתי ואני מאשר/ת").click();
  await page.getByRole("button", { name: "המשך" }).click();
}
