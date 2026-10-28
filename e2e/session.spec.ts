import { test, expect } from "@playwright/test";
import { completeWelcome, expectPath, signInWithPhone } from "./helpers";

// Automatic sign-out after 60 minutes without activity (src/lib/idle.ts).
test.describe.configure({ mode: "serial" });
const PHONE = "050-000-0012";

test("server: a request after more than an hour of inactivity signs the user out", async ({ page, context, baseURL }) => {
  await signInWithPhone(page, PHONE);
  await completeWelcome(page, "Gil Avraham", ["poster"]);
  await page.getByText("אדם פרטי").click();
  await page.getByLabel("עיר").fill("חיפה");
  await page.getByRole("button", { name: "סיום" }).click();
  await expectPath(page, "/home");

  // Leave the app first, so no open tab records activity, then make the last activity 61 minutes old.
  await page.goto("about:blank");
  await context.addCookies([{ name: "joby_last_active", value: String(Date.now() - 61 * 60_000), url: baseURL! }]);
  expect((await context.cookies()).filter((c) => c.name === "joby_last_active")).toHaveLength(1);
  await page.goto("/poster/jobs");
  await expect(page).toHaveURL(/\/login\?reason=idle&next=%2Fposter%2Fjobs/);
  await expect(page.getByText("נותקת אחרי שעה בלי פעילות")).toBeVisible();
  await page.goto("/home");
  await expectPath(page, "/login"); // really signed out

  // Signing in again returns to the page they were on.
  await page.goto("/login?reason=idle&next=%2Fposter%2Fjobs");
  await page.getByLabel("מספר טלפון נייד").fill(PHONE);
  await page.getByRole("button", { name: "שלחו לי קוד" }).click();
  await page.getByLabel("קוד אימות").fill("123456");
  await page.getByRole("button", { name: "אישור" }).click();
  await expectPath(page, "/poster/jobs");
});

test("browser: warning two minutes before, 'still here' keeps the session, then sign-out", async ({ page }) => {
  await page.clock.install();
  await new Promise((r) => setTimeout(r, 1500)); // the auth server allows one SMS code per second
  await signInWithPhone(page, PHONE);
  await expectPath(page, "/home");

  await page.clock.fastForward("58:30");
  const warning = page.getByRole("alertdialog", { name: "ניתוק בגלל חוסר פעילות" });
  await expect(warning).toBeVisible();
  await warning.getByRole("button", { name: "אני עדיין כאן" }).click();
  await expect(warning).toBeHidden();

  await page.clock.fastForward("30:00");
  await expect(warning).toBeHidden(); // activity reset the timer
  await page.clock.fastForward("31:30");
  await expect(page).toHaveURL(/\/login\?reason=idle&next=%2Fhome/);
  await page.goto("/home");
  await expectPath(page, "/login");
});

test("activity keeps the session alive", async ({ page }) => {
  await page.clock.install();
  await new Promise((r) => setTimeout(r, 1500)); // the auth server allows one SMS code per second
  await signInWithPhone(page, PHONE);
  for (let i = 0; i < 3; i++) {
    await page.clock.fastForward("40:00");
    await page.mouse.click(10, 300);
  }
  await page.clock.fastForward("00:30");
  await expect(page).toHaveURL(/\/home$/); // 2 hours in total, never 60 idle minutes
});
