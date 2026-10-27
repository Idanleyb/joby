import { test, expect } from "@playwright/test";
import { PNG, expectPath, serviceRest, signInWithPhone, userIdByPhone } from "./helpers";

// Runs after jobs.spec (same database): Dana (poster, 050-000-0010) and Eli (electrician, 050-000-0011).
test.describe.configure({ mode: "serial" });

const menu = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "תפריט ראשי" });

test("provider: notifications, proposals tabs, availability and photo gallery", async ({ page }) => {
  await signInWithPhone(page, "050-000-0011");
  await expectPath(page, "/home");
  await expect(page.getByRole("heading", { name: "שלום, Eli" })).toBeVisible();

  await menu(page).getByRole("link", { name: /התראות/ }).click();
  await expect(page.getByText("עבודה חדשה שמתאימה לך: החלפת לוח חשמל ישן")).toBeVisible();
  await expect(page.getByText("המפרסם צפה במועמדות שלך").first()).toBeVisible();
  await expect(page.getByText("נבחרת לעבודה!")).toBeVisible();
  await page.getByRole("button", { name: "סימון הכול כנקרא" }).click();
  await expect(page.getByText("אין התראות חדשות")).toBeVisible();

  await menu(page).getByRole("link", { name: "הצעות" }).click();
  await page.getByRole("link", { name: /נבחרתי/ }).click();
  await expect(page.getByRole("link", { name: "התקנת עמדת טעינה בבית פרטי" })).toBeVisible();
  await page.getByRole("link", { name: /סגורות/ }).click();
  await expect(page.getByText("הקרדיטים הוחזרו")).toBeVisible(); // the job closed without a hire

  await menu(page).getByRole("link", { name: "פרופיל" }).click();
  await expect(page.getByRole("progressbar", { name: "חוזק הפרופיל" })).toBeVisible();
  await page.getByText("עסוק/ה כרגע").click();
  await page.getByLabel("עד (לא חובה)").fill("2099-01-31");
  await page.getByRole("button", { name: "שמירת הזמינות" }).click();
  await expect(page.getByRole("button", { name: "נשמר ✓" })).toBeVisible();
  await page.locator("#gallery-input").setInputFiles({ name: "work.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("button", { name: "הסרת התמונה" })).toBeVisible();
  const id = await userIdByPhone("+972500000011");
  await expect.poll(async () => (await serviceRest(`provider_profiles?select=gallery_paths&user_id=eq.${id}`))[0].gallery_paths.length).toBe(1);

  await page.goto(`/providers/${id}`);
  await expect(page.getByText("עסוק/ה עד 31/01/2099")).toBeVisible();
  await expect(page.getByRole("heading", { name: "תמונות מעבודות" })).toBeVisible();
  const photo = page.locator("section", { hasText: "תמונות מעבודות" }).locator("img").first();
  await expect.poll(() => photo.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText("ב-Joby מאז")).toBeVisible();

  await menu(page).getByRole("link", { name: "חשבון" }).click();
  await expect(page.getByText("מילואימניק/ית מאומת/ת")).toBeVisible();
  await expect(page.getByText("פרטים אישיים")).toBeVisible();
});

test("poster: own profile, edit, public profile and provider search", async ({ page }) => {
  await signInWithPhone(page, "050-000-0010");
  await expectPath(page, "/home");
  await menu(page).getByRole("link", { name: "פרופיל" }).click();
  await page.getByRole("link", { name: "עריכה" }).click();
  await page.getByLabel("קצת עלינו (לא חובה)").fill("משפחה מפתח תקווה, משפצים את הבית בשלבים.");
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.getByText("נשמר ✓")).toBeVisible();
  const id = await userIdByPhone("+972500000010");
  await page.goto(`/posters/${id}`);
  await expect(page.getByText("משפחה מפתח תקווה, משפצים את הבית בשלבים.")).toBeVisible();
  await expect(page.getByText("עבודות פורסמו")).toBeVisible();
  await expect(page.getByText("שיעור גיוס")).toBeVisible();

  await menu(page).getByRole("link", { name: "נותני שירות" }).click();
  await expectPath(page, "/providers");
  const eli = page.getByRole("link", { name: /Eli C\./ });
  await expect(eli).toBeVisible();
  await page.getByLabel("קטגוריה").selectOption({ label: "בית ומשק בית" });
  await page.getByLabel("תחום").selectOption({ label: "חשמל" });
  await page.getByLabel("אזור (עיר)").fill("פתח תקווה");
  await page.getByLabel("אזור (עיר)").press("Enter");
  await page.getByLabel("מרחק", { exact: true }).selectOption("10");
  await expect(page).toHaveURL(/radius=10/);
  await expect(eli).toContainText(/[5-8] ק״מ/);
  await page.getByLabel("מיון", { exact: true }).selectOption("price");
  await expect(page).toHaveURL(/sort=price/);
  await expect(eli).toBeVisible();
  await page.getByRole("button", { name: "זמינים עכשיו" }).click();
  await expect(page.getByText("לא נמצאו נותני שירות")).toBeVisible(); // Eli is busy
  await page.goto("/providers?city=אילת&radius=25");
  await expect(page.getByText("לא נמצאו נותני שירות")).toBeVisible();
});

test("jobs feed: area filter by distance", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/jobs?city=" + encodeURIComponent("ראש העין") + "&radius=10");
  await expect(page.getByRole("link", { name: "הקמת חשמל לאולם קזינו" })).toBeVisible(); // Petah Tikva, ~7 km
  await page.goto("/jobs?city=" + encodeURIComponent("אילת") + "&radius=25");
  await expect(page.getByText("אין עבודות שמתאימות לסינון.")).toBeVisible();
});
