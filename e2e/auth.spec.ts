import { test, expect } from "@playwright/test";
import { createGoogleLikeUser, expectPath, formAlert, injectSession, signInWithPhone, TEST_CODE } from "./helpers";

// Test numbers (supabase/config.toml): 050-000-0001 … 050-000-0004, code 123456.
// Run on a fresh database (npm run db:reset).

test("home page links to sign-in and shows categories", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "המרקטפלייס של המילואים" })).toBeVisible();
  await expect(page.getByText("תכנות וטכנולוגיה")).toBeVisible();
  await page.getByRole("link", { name: "מצאו עבודה" }).click();
  await expectPath(page, "/login");
});

test("login validates phone and code", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("מספר טלפון נייד").fill("12345");
  await page.getByRole("button", { name: "שלחו לי קוד" }).click();
  await expect(formAlert(page)).toContainText("מספר נייד ישראלי");

  await page.getByLabel("מספר טלפון נייד").fill("050-000-0004");
  await page.getByRole("button", { name: "שלחו לי קוד" }).click();
  await expect(page.getByText("050-000-0004")).toBeVisible();
  await expect(page.getByRole("button", { name: /שליחה חוזרת בעוד/ })).toBeDisabled();
  await page.getByLabel("קוד אימות").fill("000000");
  await page.getByRole("button", { name: "אישור" }).click();
  await expect(formAlert(page)).toContainText("הקוד שגוי");
});

test("new poster: phone → welcome → poster details → account → sign out → sign in again", async ({ page }) => {
  await signInWithPhone(page, "050-000-0001");
  await expectPath(page, "/onboarding/welcome");

  await page.getByRole("button", { name: "המשך" }).click();
  await expect(page.getByText("יש להזין שם פרטי ושם משפחה.")).toBeVisible();
  await expect(page.getByText("יש לבחור לפחות אפשרות אחת.")).toBeVisible();
  await expect(page.getByText("יש לאשר את תנאי השימוש")).toBeVisible();
  await page.getByLabel("שם מלא").fill("Avi");
  await page.getByText("לפרסם עבודות ולגייס").click();
  await page.getByRole("button", { name: "המשך" }).click();
  await expect(page.getByText("יש להזין שם פרטי ושם משפחה.")).toBeVisible();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await expect(page.getByRole("checkbox").nth(1)).toBeChecked(); // choice kept after the error

  await page.getByLabel("שם מלא").fill("Avi Mor");
  await page.getByText("קראתי ואני מאשר/ת").click();
  await page.getByRole("button", { name: "המשך" }).click();
  await expectPath(page, "/onboarding/poster");

  await page.getByText("עסק", { exact: true }).click();
  await page.getByLabel("עיר").fill("ראשון לציון");
  await page.getByRole("button", { name: "סיום" }).click();
  await expect(page.getByText("יש להזין את שם הארגון.")).toBeVisible();
  await expect(page.getByLabel("עיר")).toHaveValue("ראשון לציון"); // kept after the error
  await page.getByLabel("שם הארגון").fill("Mor Renovations");
  await page.getByRole("button", { name: "סיום" }).click();

  await expectPath(page, "/account");
  await expect(page.getByRole("heading", { name: "שלום, Avi" })).toBeVisible();
  await expect(page.getByText("Mor Renovations · עסק · ראשון לציון")).toBeVisible();
  await expect(page.getByRole("button", { name: "אני רוצה להציע שירותים" })).toBeVisible();

  await page.getByRole("button", { name: "התנתקות" }).click();
  await expectPath(page, "/");
  await expect(page.getByRole("link", { name: "כניסה" })).toBeVisible();

  // Returning user goes straight to the account.
  await signInWithPhone(page, "0500000001");
  await expectPath(page, "/account");
});

test("new provider sees verification as the next step and can add the poster role", async ({ page }) => {
  await signInWithPhone(page, "+972 50 000 0002");
  await page.getByLabel("שם מלא").fill("Noa Barak");
  await page.getByText("להציע שירותים").click();
  await page.getByText("קראתי ואני מאשר/ת").click();
  await page.getByRole("button", { name: "המשך" }).click();
  await expectPath(page, "/account");
  await expect(page.getByText("טרם הוגש אימות")).toBeVisible();

  await page.getByRole("link", { name: "אני רוצה לפרסם עבודות" }).click();
  await expectPath(page, "/onboarding/poster");
  await page.getByText("אדם פרטי").click();
  await page.getByLabel("עיר").fill("תל אביב-יפו");
  await page.getByRole("button", { name: "סיום" }).click();
  await expectPath(page, "/account");
  await expect(page.getByText("Noa B. · אדם פרטי · תל אביב-יפו")).toBeVisible();
});

test("Google sign-up must add a phone, then continues with the Google name", async ({ page, context, baseURL }) => {
  await createGoogleLikeUser("dana.google@example.com", "Dana Levi", "test-password-123");
  await injectSession(context, baseURL!, "dana.google@example.com", "test-password-123");

  await page.goto("/account");
  await expectPath(page, "/onboarding/phone");
  await page.getByLabel("מספר טלפון נייד").fill("050-000-0003");
  await page.getByRole("button", { name: "שלחו לי קוד" }).click();
  await page.getByLabel("קוד אימות").fill(TEST_CODE);
  await page.getByRole("button", { name: "אישור" }).click();

  await expectPath(page, "/onboarding/welcome");
  await expect(page.getByLabel("שם מלא")).toHaveValue("Dana Levi");
});

test("Google user cannot take a phone number that already has an account", async ({ page, context, baseURL }) => {
  await createGoogleLikeUser("eli.google@example.com", "Eli Cohen", "test-password-123");
  await injectSession(context, baseURL!, "eli.google@example.com", "test-password-123");
  await page.goto("/onboarding/phone");
  await page.getByLabel("מספר טלפון נייד").fill("050-000-0001");
  await page.getByRole("button", { name: "שלחו לי קוד" }).click();
  await expect(formAlert(page)).toContainText("כבר רשום");
});

test("Google button starts the Google sign-in", async ({ page }) => {
  await page.goto("/login");
  const request = page.waitForRequest((r) => r.url().includes("/auth/v1/authorize?provider=google"));
  await page.getByRole("button", { name: "המשך עם Google" }).click();
  const url = new URL((await request).url());
  expect(url.searchParams.get("redirect_to")).toContain("/auth/callback?next=%2Fonboarding");
});

test("signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/account");
  await expectPath(page, "/login");
});
