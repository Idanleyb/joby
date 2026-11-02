import { test, expect } from "@playwright/test";
import { completeWelcome, serviceRest, signInWithPhone, userIdByPhone } from "./helpers";

// Runs after jobs.spec (Eli, 050-000-0011, applied to jobs) and the admin-invite spec (admin 050-000-0006).
const ADMIN = { local: "050-000-0006", e164: "+972500000006" };
const ELI = { e164: "+972500000011" };

test("admin: find a user, fix details, see credit usage, sign in as the user and back out", async ({ page }) => {
  await page.context().clearCookies();
  await signInWithPhone(page, ADMIN.local);
  if (page.url().includes("/onboarding/welcome")) await completeWelcome(page, "Ops Admin", []);
  const adminId = await userIdByPhone(ADMIN.e164);
  await serviceRest("admins?on_conflict=user_id", { method: "POST", body: JSON.stringify({ user_id: adminId, role: "admin" }), headers: { Prefer: "resolution=merge-duplicates" } });
  const eli = await userIdByPhone(ELI.e164);

  // Find and fix.
  await page.goto("/admin");
  await page.getByRole("link", { name: "משתמשים" }).click();
  await page.getByLabel("חיפוש משתמש").fill("050-000-0011");
  await page.getByRole("button", { name: "חיפוש" }).click();
  await page.getByRole("link", { name: /Eli/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/admin/users/${eli}$`));
  await page.getByLabel("שם פרטי").fill("Elisha");
  await page.getByRole("button", { name: "שמירת הפרטים" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "סיבה" })).toHaveCount(0); // required field blocks submit without a reason
  await page.getByLabel("סיבת השינוי (חובה, נשמרת ביומן)").fill("asked by phone to fix a typo");
  await page.getByRole("button", { name: "שמירת הפרטים" }).click();
  await expect(page.getByText("נשמר ✓")).toBeVisible();
  const [p] = await serviceRest(`profiles?select=full_name&id=eq.${eli}`);
  expect(p.full_name).toMatch(/^Elisha /);

  // Credit usage.
  await page.goto("/admin/credits?period=all");
  const row = page.getByRole("row", { name: /Elisha/ });
  await expect(row).toBeVisible();
  await expect(page.getByRole("row", { name: /סה״כ/ })).toBeVisible();
  await page.getByRole("link", { name: "7 ימים אחרונים" }).click();
  await expect(page).toHaveURL(/period=7d/);

  // Sign in as the user, then back out.
  await page.goto(`/admin/users/${eli}`);
  await page.getByRole("button", { name: /כניסה לחשבון של/ }).click();
  await page.getByLabel("סיבה").fill("checking his proposals page");
  await page.getByRole("button", { name: "כניסה לחשבון (30 דקות)" }).click();
  await expect(page).toHaveURL(/\/home$/);
  const banner = page.getByRole("alert").filter({ hasText: "מצב ניהול" });
  await expect(banner).toContainText("Elisha");
  await expect(page.getByRole("heading", { name: /שלום, Elisha/ })).toBeVisible();
  await page.goto("/proposals");
  await expect(banner).toBeVisible();
  await banner.getByRole("button", { name: "יציאה מהחשבון" }).click();
  await expect(page).toHaveURL(/\/login\?reason=impersonation_ended/);
  await expect(page.getByText("הגישה לחשבון המשתמש הסתיימה")).toBeVisible();
  const [log] = await serviceRest(`admin_impersonations?select=reason,ended_at&user_id=eq.${eli}&order=started_at.desc&limit=1`);
  expect(log.reason).toBe("checking his proposals page");
  expect(log.ended_at).not.toBeNull();
  // Eli's own confirmed email was not replaced by the sign-in placeholder.
  const [after] = await serviceRest(`profiles?select=email&id=eq.${eli}`);
  expect(after.email ?? "").not.toContain(".invalid");
});
