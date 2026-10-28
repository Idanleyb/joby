import { test, expect } from "@playwright/test";
import { expectPath, serviceRest, signInWithPhone, userIdByPhone } from "./helpers";

// Runs after jobs.spec and profiles.spec (same database): Dana (poster, 050-000-0010), Eli (electrician, 050-000-0011).
test.describe.configure({ mode: "serial" });

const DANA = { local: "050-000-0010", e164: "+972500000010" };
const ELI = { local: "050-000-0011", e164: "+972500000011" };

async function as(page: import("@playwright/test").Page, phone: string) {
  await page.context().clearCookies();
  await signInWithPhone(page, phone);
}
const balance = async (id: string) => (await serviceRest(`provider_wallets?select=balance&provider_id=eq.${id}`))[0].balance as number;

test("intro page explains roles and credits; every apply point shows the 10-credit note", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  await page.getByRole("link", { name: "איך זה עובד?" }).click();
  await expectPath(page, "/how-it-works");
  for (const h of ["איך מתחילים להציע שירותים", "בן או בת זוג של מילואימניק", "איך עובדים הקרדיטים", "צריכים מישהו לעבודה?", "משוב אחרי כל עבודה"]) {
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  }
  await expect(page.getByRole("row", { name: /הגשת מועמדות לעבודה/ })).toContainText("−10");
  await expect(page.getByRole("row", { name: /אישור פנייה ישירה/ })).toContainText("−2");
  await expect(page.getByText("100 קרדיטים מתנה").first()).toBeVisible();

  await page.goto("/jobs");
  const card = page.locator("article").first();
  await expect(card.getByText("הגשת מועמדות:")).toBeVisible();
  await expect(card.getByText("10 קרדיטים")).toBeVisible();
  await card.getByRole("link").first().click();
  await expect(page.getByText("חוזרים אם העבודה נסגרת בלי גיוס")).toBeVisible();
});

test("poster sends a direct request from the provider's profile", async ({ page }) => {
  await as(page, DANA.local);
  const eli = await userIdByPhone(ELI.e164);
  await page.goto(`/providers/${eli}`);
  await page.getByRole("link", { name: "שליחת פנייה ישירה" }).click();
  await expectPath(page, `/providers/${eli}/request`);
  await expect(page.getByLabel("תחום")).toHaveValue(/\d+/); // only one subcategory: preselected
  await page.getByLabel("כותרת").fill("תיקון קצר בלוח החשמל");
  await page.getByLabel("תיאור").fill("המפסק הראשי קופץ כל כמה שעות, צריך בדיקה ותיקון.");
  await page.getByText("בשטח", { exact: true }).click();
  await page.getByText("מחיר לעבודה", { exact: true }).click();
  await page.getByLabel("מ- (₪)").fill("300");
  await page.getByLabel("עד (₪)").fill("500");
  await page.getByText("תוך שבוע", { exact: true }).click();
  await page.getByRole("button", { name: "שליחת הפנייה" }).click();
  await expectPath(page, "/poster/requests");
  await expect(page.getByText("הפנייה נשלחה ✓")).toBeVisible();
  await expect(page.getByText("ממתינה לתשובה")).toBeVisible();

  await page.goto(`/providers/${eli}`);
  await expect(page.getByText("שלחת פנייה והיא ממתינה לתשובה")).toBeVisible();
});

test("provider approves the request for 2 credits; contacts are revealed", async ({ page }) => {
  await as(page, ELI.local);
  const eli = await userIdByPhone(ELI.e164);
  const before = await balance(eli);
  await expect(page.getByText("פנייה ישירה אחת ממתינה לתשובה")).toBeVisible();
  await page.getByText("פנייה ישירה אחת ממתינה לתשובה").click();
  await expectPath(page, "/proposals");
  await expect(page.getByRole("heading", { name: "תיקון קצר בלוח החשמל" })).toBeVisible();
  await page.getByRole("button", { name: "אישור · 2 קרדיטים" }).click();
  await expect(page.getByText(`יתרה אחרי: ${before - 2}`)).toBeVisible();
  await page.getByRole("button", { name: "אישור", exact: true }).click();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/972500000010");
  expect(await balance(eli)).toBe(before - 2);

  await as(page, DANA.local);
  await page.goto("/poster/requests");
  await expect(page.getByText("אושרה ✓")).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/972500000011");
});

test("both sides leave feedback; reviews appear on both profiles", async ({ page }) => {
  await as(page, DANA.local);
  await page.goto("/feedback");
  await page.getByRole("link", { name: /התקנת עמדת טעינה בבית פרטי/ }).click();
  await page.getByText("כן", { exact: true }).first().click();
  await page.getByRole("button", { name: "שליחת המשוב" }).click();
  await expect(page.getByText("יש לתת דירוג כללי")).toBeVisible();
  await page.getByLabel("דירוג כללי: 5 מתוך 5").check({ force: true });
  await page.getByLabel("איכות העבודה: 5 מתוך 5").check({ force: true });
  await page.getByLabel("תגובה פומבית (לא חובה)").fill("עבודה נקייה ומקצועית, הגיע בזמן.");
  await page.getByRole("button", { name: "שליחת המשוב" }).click();
  await expectPath(page, "/feedback");
  await expect(page.getByText("חוות הדעת תתפרסם כששני הצדדים ישלחו")).toBeVisible();

  await as(page, ELI.local);
  await page.goto("/feedback");
  await page.getByRole("link", { name: /התקנת עמדת טעינה בבית פרטי/ }).click();
  await page.getByText("כן", { exact: true }).first().click();
  await page.getByLabel("דירוג כללי: 4 מתוך 5").check({ force: true });
  await page.getByLabel("תגובה פומבית (לא חובה)").fill("הסבירה בדיוק מה צריך ושילמה בזמן.");
  await page.getByRole("button", { name: "שליחת המשוב" }).click();
  await expectPath(page, "/feedback");

  const eli = await userIdByPhone(ELI.e164);
  const dana = await userIdByPhone(DANA.e164);
  await page.goto(`/providers/${eli}`);
  await expect(page.getByText("עבודה נקייה ומקצועית, הגיע בזמן.")).toBeVisible();
  await expect(page.getByText("התקנת עמדת טעינה בבית פרטי").first()).toBeVisible();
  await page.goto(`/posters/${dana}`);
  await expect(page.getByText("הסבירה בדיוק מה צריך ושילמה בזמן.")).toBeVisible();
});

test("blocked for missing feedback: banner until feedback is given", async ({ page }) => {
  const eli = await userIdByPhone(ELI.e164);
  const [eng] = await serviceRest(`engagements?select=id&provider_id=eq.${eli}&source=eq.request`);
  const old = new Date(Date.now() - 31 * 86_400_000).toISOString();
  await serviceRest("feedback_requests", { method: "POST", body: JSON.stringify({
    engagement_id: eng.id, user_id: eli, direction: "provider_to_poster", requested_at: old, reminders_sent: 2, blocked_at: new Date().toISOString() }) });

  await as(page, ELI.local);
  const banner = page.getByRole("alert").filter({ hasText: "החשבון חסום לפעולות חדשות" });
  await expect(banner).toBeVisible();
  await banner.getByRole("link", { name: "להשארת משוב" }).click();
  await expect(page.getByText("עוד לא", { exact: true })).toHaveCount(0); // after the last reminder only Yes / No
  await page.getByText("לא", { exact: true }).click();
  await page.getByLabel("מה קרה?").selectOption("availability");
  await page.getByRole("button", { name: "שליחת המשוב" }).click();
  await expectPath(page, "/feedback");
  await expect(page.getByText("רשמנו. התשובה לא מוצגת לאף אחד.")).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "החשבון חסום" })).toHaveCount(0);
});
