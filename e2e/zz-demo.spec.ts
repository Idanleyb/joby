import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { expectPath, signInWithPhone } from "./helpers";

// Loads supabase/demo/load_demo.sql into the test database, walks the demo flows with the four
// demo sign-in accounts, then removes the demo data. Needs E2E_DB_URL (psql connection string).
const DB = process.env.E2E_DB_URL;
test.describe.configure({ mode: "serial" });
test.skip(!DB, "E2E_DB_URL not set");

const psql = (sql: string) => execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", DB!, "-c", sql], { encoding: "utf8" });

test.beforeAll(() => {
  execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", DB!, "-f", path.join(__dirname, "../supabase/demo/load_demo.sql")]);
});
test.afterAll(() => {
  psql("select private.purge_demo();");
});

test("demo provider (Yossi): home, approve a direct request, apply to a demo job", async ({ page }) => {
  await signInWithPhone(page, "050-000-0101");
  await expectPath(page, "/home");
  await expect(page.getByText("חשבון דמו")).toBeVisible();
  await expect(page.getByText("פנייה ישירה אחת ממתינה לתשובה")).toBeVisible();
  await expect(page.getByText("משוב על עבודות (1)")).toBeVisible();

  await page.getByText("פנייה ישירה אחת ממתינה לתשובה").click();
  await expect(page.getByRole("heading", { name: "התקנת מאוורר תקרה ותאורה בסלון" })).toBeVisible();
  await page.getByRole("button", { name: "אישור · 2 קרדיטים" }).click();
  await page.getByRole("button", { name: "אישור", exact: true }).click();
  const card = page.locator("li", { has: page.getByRole("heading", { name: "התקנת מאוורר תקרה ותאורה בסלון" }) });
  await expect(card.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/972500000103");

  await page.goto("/jobs");
  const job = page.locator("article", { hasText: "החלפת לוח חשמל ישן ותוספת שקעים" });
  await expect(job.getByText("דמו")).toBeVisible();
  await job.getByRole("link", { name: "החלפת לוח חשמל ישן ותוספת שקעים" }).click();
  await page.getByRole("button", { name: /הגשת מועמדות/ }).click();
  await page.getByLabel("למה את/ה מתאים/ה?").fill("חשמלאי מוסמך מראשון לציון, החלפתי עשרות לוחות ישנים. אוכל להגיע כבר מחר לבדיקה.");
  await page.getByRole("button", { name: "המשך" }).click();
  await page.getByRole("button", { name: "אישור ושליחה" }).click();
  await expect(page.getByText("המועמדות נשלחה ✓")).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByText("★ 4.7")).toBeVisible();
});

test("demo poster (Avi): review applicants and hire", async ({ page }) => {
  await signInWithPhone(page, "050-000-0103");
  await expectPath(page, "/home");
  await page.getByRole("link", { name: /החלפת לוח חשמל ישן ותוספת שקעים/ }).click();
  await expect(page.getByRole("heading", { name: "מועמדים (5)" })).toBeVisible();
  await page.getByRole("link", { name: /יוסי מ\./ }).click();
  await expect(page.getByText("חשמלאי מוסמך מראשון לציון")).toBeVisible();
  await page.getByRole("button", { name: "בחירה בנותן/ת השירות" }).click();
  await page.getByRole("button", { name: "כן, בחירה" }).click();
  await expect(page.getByText("בחרת בנותן/ת השירות הזה/ו ✓")).toBeVisible();
  await page.goto("/poster/requests");
  await expect(page.getByText("אושרה ✓").first()).toBeVisible();
});

test("demo HR poster (Lumen): feedback due; demo contacts show a placeholder", async ({ page }) => {
  await signInWithPhone(page, "050-000-0104");
  await page.goto("/feedback");
  await page.getByRole("link", { name: /בדיקת לוח חשמל ותאורה במשרד/ }).click();
  await expect(page.getByText("עבדתם יחד עם")).toBeVisible();
  await page.goto("/poster/jobs");
  await page.getByRole("link", { name: /דף נחיתה למוצר SaaS חדש/ }).click();
  // An applicant the poster already contacted: demo users have no real phone, so a placeholder shows.
  await page.locator("li", { hasText: "יצרת קשר" }).first().getByRole("link").click();
  await page.waitForURL(/\/applications\//);
  await expect(page.getByText("משתמש דמו — אין פרטי קשר אמיתיים")).toBeVisible();
});

test("real users see demo content tagged and cannot transact with it", async ({ page }) => {
  await signInWithPhone(page, "050-000-0011"); // Eli, a real provider from jobs.spec
  await page.goto("/jobs?tab=new");
  const demoJob = page.locator("article", { hasText: "דמו" }).first();
  await expect(demoJob).toBeVisible();
  await demoJob.getByRole("link").first().click();
  await expect(page.getByText("עבודת דמו — נתונים לדוגמה")).toBeVisible();
  await expect(page.getByText("זו עבודת דמו להמחשה. אפשר להגיש אליה רק מחשבון דמו.")).toBeVisible();
  await expect(page.getByRole("button", { name: /הגשת מועמדות/ })).toHaveCount(0);
});

test("admin sees the demo tile and the demo verification queue", async ({ page }) => {
  await signInWithPhone(page, "050-000-0006"); // admin from provider.spec
  await page.goto("/admin");
  await expect(page.getByText("נתוני דמו טעונים")).toBeVisible();
  await page.goto("/admin/verifications");
  await page.getByRole("link", { name: "בדיקה", exact: true }).first().click();
  await expect(page.getByText(/חשבון דמו — אין מסמכים אמיתיים|מוזמן\/ת על ידי/)).toBeVisible();
});
