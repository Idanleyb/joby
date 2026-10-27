import { test, expect, type Page } from "@playwright/test";
import { completeWelcome, expectPath, formAlert, serviceRest, signInWithPhone, userIdByPhone } from "./helpers";

// Flow A end to end: post → match → apply (10 credits) → open → contact → hire; close → refund; moderation.
test.describe.configure({ mode: "serial" });

const POSTER = { local: "050-000-0010", e164: "+972500000010" };
const PROVIDER = { local: "050-000-0011", e164: "+972500000011" };
const ADMIN = { local: "050-000-0006", e164: "+972500000006" };
const PITCH = "שלום, אני חשמלאי מוסמך עם 12 שנות ניסיון בהתקנת עמדות טעינה. אשמח להגיע לבדיקה כבר השבוע.";

async function as(page: Page, phone: string) {
  await page.context().clearCookies();
  await signInWithPhone(page, phone);
}

async function becomePoster(page: Page, name: string) {
  if (!page.url().includes("/onboarding/welcome")) return;
  await completeWelcome(page, name, ["poster"]);
  await page.getByText("אדם פרטי").click();
  await page.getByLabel("עיר").fill("ראש העין");
  await page.getByRole("button", { name: "סיום" }).click();
  await expectPath(page, "/home");
}

async function balance(userId: string) {
  return (await serviceRest(`provider_wallets?select=balance&provider_id=eq.${userId}`))[0].balance as number;
}

async function postJob(page: Page, title: string, opts: { quotes?: boolean } = {}) {
  await page.goto("/jobs/new");
  await page.getByLabel("קטגוריה").selectOption({ label: "בית ומשק בית" });
  await page.getByLabel("תחום").selectOption({ label: "חשמל" });
  await page.getByLabel("כותרת").fill(title);
  await page.getByLabel("תיאור").fill("צריך להתקין עמדת טעינה לרכב חשמלי בחניה של בית פרטי, כולל הכנת תשתית מהלוח.");
  await page.getByText("בשטח", { exact: true }).click();
  await page.getByLabel("עיר").fill("פתח תקווה");
  if (opts.quotes) await page.getByText("הצעות מחיר", { exact: true }).click();
  else {
    await page.getByText("מחיר לעבודה", { exact: true }).click();
    await page.getByLabel("מ- (₪)").fill("1500");
    await page.getByLabel("עד (₪)").fill("2500");
  }
  await page.getByText("תוך שבוע", { exact: true }).click();
  await page.getByRole("button", { name: "תצוגה מקדימה" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await page.getByRole("button", { name: "פרסום העבודה" }).click();
  await page.waitForURL(/\/poster\/jobs\/[0-9a-f-]{36}\?posted=1/);
  return page.url().match(/jobs\/([0-9a-f-]{36})/)![1];
}

let jobId = "";

test("poster posts a job; the budget rule applies to remote work", async ({ page }) => {
  await signInWithPhone(page, POSTER.local);
  await becomePoster(page, "Dana Levi");

  await page.goto("/jobs/new");
  await page.getByLabel("קטגוריה").selectOption({ label: "בית ומשק בית" });
  await page.getByLabel("תחום").selectOption({ label: "חשמל" });
  await page.getByText("מרחוק", { exact: true }).click();
  await expect(page.getByText("בעבודה מרחוק חובה לציין תקציב.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "הצעות מחיר" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "תצוגה מקדימה" })).toBeDisabled();

  jobId = await postJob(page, "התקנת עמדת טעינה בבית פרטי");
  await expect(page.getByText("העבודה פורסמה ✓")).toBeVisible();
  await expect(page.getByText("עוד אין מועמדים.")).toBeVisible();
  await page.goto("/poster/jobs");
  await expect(page.getByText("התקנת עמדת טעינה בבית פרטי")).toBeVisible();
  await expect(page.getByText("פתוחה")).toBeVisible();
});

test("verified provider sees the job in Matches, saves it and applies for 10 credits", async ({ page }) => {
  await signInWithPhone(page, PROVIDER.local);
  await completeWelcome(page, "Eli Cohen", ["provider"]);
  await expectPath(page, "/provider/onboarding/proof");
  // Shortcut: verification is covered by provider.spec — approve directly.
  const id = await userIdByPhone(PROVIDER.e164);
  const sub = (await serviceRest("subcategories?select=id&slug=eq.electricity"))[0].id;
  await serviceRest(`provider_profiles?user_id=eq.${id}`, { method: "PATCH", body: JSON.stringify({
    verification_status: "approved", verified_at: new Date().toISOString(), display_name: "Eli C.", headline: "חשמלאי מוסמך",
    city: "ראש העין", radius_km: 25, works_onsite: true, onboarding_step: 8 }) });
  await serviceRest("provider_subcategories", { method: "POST", body: JSON.stringify({ provider_id: id, subcategory_id: sub }) });
  await serviceRest(`provider_wallets?provider_id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ balance: 100 }) });

  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: "מתאימות לי" })).toBeVisible();
  const card = page.locator("article", { hasText: "התקנת עמדת טעינה בבית פרטי" });
  await expect(card).toBeVisible(); // same region (Rosh HaAyin ↔ Petah Tikva, 25 km)
  await expect(card.getByText("₪1,500–₪2,500")).toBeVisible();
  await card.getByRole("button", { name: "שמירה" }).click();
  await expect(card.getByRole("button", { name: "הסרה מהשמורות" })).toBeVisible();
  await page.getByRole("link", { name: /שמורות/ }).click();
  await expect(page.locator("article", { hasText: "התקנת עמדת טעינה בבית פרטי" })).toBeVisible();

  await page.getByRole("link", { name: "התקנת עמדת טעינה בבית פרטי" }).click();
  await expectPath(page, `/jobs/${jobId}`);
  await page.getByRole("button", { name: "הגשת מועמדות · 10 קרדיטים" }).click();
  await page.getByLabel("למה את/ה מתאים/ה?").fill("קצר מדי");
  await expect(page.getByRole("button", { name: "המשך" })).toBeDisabled();
  await page.getByLabel("למה את/ה מתאים/ה?").fill(PITCH);
  await page.getByLabel("הצעת מחיר ₪ (לא חובה)").fill("1800");
  await page.getByRole("button", { name: "המשך" }).click();
  await expect(page.getByText("יתרה אחרי: 90")).toBeVisible();
  await page.getByRole("button", { name: "אישור ושליחה" }).click();
  await expect(page.getByText("המועמדות נשלחה ✓")).toBeVisible();
  expect(await balance(id)).toBe(90);

  await page.goto("/provider/credits");
  await expect(page.getByText("הגשת מועמדות", { exact: true })).toBeVisible();
  await expect(page.getByText("-10")).toBeVisible();
});

test("poster opens the application, reveals contact and hires", async ({ page }) => {
  await as(page, POSTER.local);
  await page.goto("/poster/jobs");
  await expect(page.getByText("1 חדשים")).toBeVisible();
  await page.getByRole("link", { name: /התקנת עמדת טעינה/ }).click();
  await page.getByRole("link", { name: /Eli C\./ }).click();
  await expect(page.getByText(PITCH)).toBeVisible();
  await expect(page.getByText("₪1,800")).toBeVisible();
  await expect.poll(async () => (await serviceRest(`applications?select=viewed_at&job_id=eq.${jobId}`))[0].viewed_at).not.toBeNull();

  await page.getByRole("button", { name: "יצירת קשר (חשיפת טלפון)" }).click();
  await page.getByRole("button", { name: "חשיפה" }).click();
  await expect(page.getByRole("heading", { name: "פרטי קשר" })).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/972500000011");

  await page.getByRole("button", { name: "בחירה בנותן/ת השירות" }).click();
  await page.getByRole("button", { name: "כן, בחירה" }).click();
  await expect(page.getByText("בחרת בנותן/ת השירות הזה/ו ✓")).toBeVisible();
  await expect(page.getByRole("button", { name: "בחירה בנותן/ת השירות" })).toBeHidden();
  const [job] = await serviceRest(`jobs?select=status&id=eq.${jobId}`);
  expect(job.status).toBe("hired");
  expect(await serviceRest(`engagements?select=id&job_id=eq.${jobId}`)).toHaveLength(1);
});

test("provider sees the hire and the poster's phone", async ({ page }) => {
  await as(page, PROVIDER.local);
  await page.goto("/provider/applications"); // old address → Proposals
  await expectPath(page, "/proposals");
  await page.getByRole("link", { name: /נבחרתי/ }).click();
  await expect(page.getByText("נבחרת! 🎉")).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/972500000010");
  await page.goto(`/jobs/${jobId}`);
  await expect(page.getByText("סטטוס המועמדות שלך:")).toBeVisible();
});

test("closing a job without a hire refunds the applicant", async ({ page }) => {
  await as(page, POSTER.local);
  const second = await postJob(page, "החלפת לוח חשמל ישן", { quotes: true });

  await as(page, PROVIDER.local);
  const id = await userIdByPhone(PROVIDER.e164);
  await page.goto(`/jobs/${second}`);
  await expect(page.getByText("פתוח להצעות מחיר").first()).toBeVisible();
  await page.getByRole("button", { name: /הגשת מועמדות/ }).click();
  await page.getByLabel("למה את/ה מתאים/ה?").fill(PITCH);
  await page.getByRole("button", { name: "המשך" }).click();
  await page.getByRole("button", { name: "אישור ושליחה" }).click();
  await expect(page.getByText("המועמדות נשלחה ✓")).toBeVisible();
  expect(await balance(id)).toBe(80);

  await as(page, POSTER.local);
  await page.goto(`/poster/jobs/${second}`);
  await page.getByRole("button", { name: "סגירה בלי גיוס" }).click();
  await page.getByRole("button", { name: "סגירה", exact: true }).click();
  await expect(page.getByText("נסגרה בלי גיוס")).toBeVisible();
  expect(await balance(id)).toBe(90);
});

test("a job with a prohibited word is held until an admin releases it", async ({ page }) => {
  await serviceRest("app_settings?key=eq.prohibited_keywords", { method: "PATCH", body: JSON.stringify({ value: ["קזינו"] }) });
  try {
    await as(page, POSTER.local);
    await page.goto("/jobs/new");
    const held = await postJob(page, "הקמת חשמל לאולם קזינו");
    await expect(page.getByText("העבודה ממתינה לבדיקה קצרה")).toBeVisible();

    await as(page, ADMIN.local);
    await becomePoster(page, "Ops Admin");
    const adminId = await userIdByPhone(ADMIN.e164);
    await serviceRest("admins?on_conflict=user_id", { method: "POST", body: JSON.stringify({ user_id: adminId, role: "admin" }), headers: { Prefer: "resolution=ignore-duplicates" } });
    await page.goto("/admin/jobs");
    await expect(page.getByRole("heading", { name: "הקמת חשמל לאולם קזינו" })).toBeVisible();
    await page.getByRole("button", { name: "אישור ופרסום" }).click();
    await expect(page.getByText("התור ריק.")).toBeVisible();
    const [job] = await serviceRest(`jobs?select=status&id=eq.${held}`);
    expect(job.status).toBe("open");
  } finally {
    await serviceRest("app_settings?key=eq.prohibited_keywords", { method: "PATCH", body: JSON.stringify({ value: [] }) });
  }
});

test("signed-out visitors can browse jobs but must sign in to apply", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto(`/jobs/${jobId}`);
  await expect(page.getByRole("link", { name: "כניסה כדי להגיש מועמדות" })).toBeVisible();
  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: "מתאימות לי" })).toHaveCount(0);
  await expect(formAlert(page)).toHaveCount(0);
});
