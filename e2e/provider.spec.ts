import { test, expect, type Page } from "@playwright/test";
import { completeWelcome, enterPhoneAndCode, expectPath, formAlert, PDF, PNG, serviceRest, signInWithPhone, storageExists, userIdByPhone } from "./helpers";

// Requires the app running with JOBY_AI_FAKE=1 (canned AI readings) and a fresh database.
test.describe.configure({ mode: "serial" });

async function becomeAdmin(page: Page, phoneLocal: string, e164: string) {
  await signInWithPhone(page, phoneLocal);
  if (page.url().includes("/onboarding/welcome")) {
    await completeWelcome(page, "Ops Admin", ["poster"]);
    await page.getByText("אדם פרטי").click();
    await page.getByLabel("עיר").fill("ראש העין");
    await page.getByRole("button", { name: "סיום" }).click();
  }
  const id = await userIdByPhone(e164);
  await serviceRest("admins?on_conflict=user_id", { method: "POST", body: JSON.stringify({ user_id: id, role: "admin" }), headers: { Prefer: "resolution=ignore-duplicates" } });
}

test("reservist completes the provider wizard with Form 3010 and CV autofill", async ({ page }) => {
  await signInWithPhone(page, "050-000-0005");
  await completeWelcome(page, "Yossi Mizrahi", ["provider"]);
  await expectPath(page, "/provider/onboarding/proof");

  // Step 1: two forms whose periods overlap → counted once (fake AI: 86 + 30 days).
  await page.locator('input[type="file"]').setInputFiles([
    { name: "form-a.pdf", mimeType: "application/pdf", buffer: PDF },
    { name: "form-b.pdf", mimeType: "application/pdf", buffer: PDF },
  ]);
  await expect(page.getByText("form-a.pdf")).toBeVisible();
  await expect(page.getByText("form-b.pdf")).toBeVisible();
  await page.getByRole("button", { name: "המשך" }).click();
  await expect(page.getByText("ספרנו 116 ימים ב-2 טפסים")).toBeVisible();
  await page.getByRole("button", { name: "אישור ושליחה לאימות" }).click();

  // Step 2: CV → AI suggestion → review → save.
  await expectPath(page, "/provider/onboarding/cv");
  await page.locator('input[type="file"]').setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: PDF });
  await page.getByRole("button", { name: "מלאו לי את הפרופיל" }).click();
  await expect(page.getByLabel("כותרת")).toHaveValue("חשמלאי מוסמך עם 12 שנות ניסיון");
  await expect(page.getByLabel("חשמל")).toBeChecked();
  await page.getByRole("button", { name: "שמירה והמשך" }).click();

  // Step 3: categories prefilled from the CV (invalid AI slug dropped).
  await expectPath(page, "/provider/onboarding/categories");
  await expect(page.getByText("נבחרו 2")).toBeVisible();
  await page.getByRole("button", { name: "המשך" }).click();

  // Step 4: area.
  await expectPath(page, "/provider/onboarding/area");
  await page.getByRole("button", { name: "המשך" }).click();
  await expect(formAlert(page)).toContainText("לפחות אחת");
  await page.getByText("עבודה בשטח").click();
  await page.getByLabel("עיר").fill("ראשון לציון");
  await page.getByLabel("מרחק עבודה").selectOption("25");
  await page.getByRole("button", { name: "המשך" }).click();

  // Step 5: about — prefilled from the CV.
  await expectPath(page, "/provider/onboarding/about");
  await expect(page.getByLabel("שנות ניסיון")).toHaveValue("12");
  await page.getByLabel("קישורים לעבודות (לא חובה, עד 5)").fill("instagram.com/yossi.electric");
  await page.getByRole("button", { name: "המשך" }).click();

  // Step 6: one service card.
  await expectPath(page, "/provider/onboarding/services");
  await page.getByLabel("שם השירות").fill("התקנת עמדת טעינה");
  await page.getByLabel("מחיר התחלתי (₪)").fill("1500");
  await page.getByRole("button", { name: "הוספת השירות" }).click();
  await expect(page.getByText("החל מ-₪1,500 לעבודה")).toBeVisible();
  await page.getByRole("button", { name: "המשך" }).click();

  // Step 7: photo, preview, finish.
  await expectPath(page, "/provider/onboarding/photo");
  await page.getByLabel("תמונת פרופיל").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("button", { name: "החלפת תמונה" })).toBeVisible();
  await expect(page.getByText("ממתין לאימות")).toBeVisible();
  await expect(page.getByText("התקנת עמדת טעינה")).toBeVisible();
  await page.getByRole("button", { name: "סיום ושמירת הפרופיל" }).click();
  await expectPath(page, "/account");
  await expect(page.getByText("הפרופיל נשמר ✓")).toBeVisible();
  await expect(page.getByText("האימות בבדיקה")).toBeVisible();
});

test("admin approves the reservist; documents are deleted; profile goes public with 100 credits", async ({ page, browser }) => {
  const provider = await userIdByPhone("+972500000005");
  const [req] = await serviceRest(`verification_requests?select=id,file_paths,days_total&user_id=eq.${provider}`);
  expect(req.days_total).toBe(116);
  expect(await storageExists("verification-docs", req.file_paths[0])).toBe(true);

  // Before approval the public cannot see the profile.
  const anon = await browser.newContext();
  const anonPage = await anon.newPage();
  await anonPage.goto(`/providers/${provider}`);
  await expect(anonPage.getByText("Yossi M.")).toHaveCount(0);

  await becomeAdmin(page, "050-000-0006", "+972500000006");
  await page.goto("/admin");
  await expect(page.getByText("אימותים ממתינים")).toBeVisible();
  await page.goto("/admin/verifications");
  await expect(page.getByRole("cell", { name: "Yossi Mizrahi" })).toBeVisible();
  await page.getByRole("link", { name: "בדיקה", exact: true }).click();
  await expect(page.getByText("סה״כ נספרו")).toBeVisible();
  await expect(page.getByLabel("סך הימים (אחרי בדיקה)")).toHaveValue("116");
  await page.getByRole("button", { name: "שמירת ההחלטה" }).click();
  await expectPath(page, "/admin/verifications");
  await expect(page.getByText("אין אימותים ממתינים.")).toBeVisible();

  expect(await storageExists("verification-docs", req.file_paths[0])).toBe(false);
  const [after] = await serviceRest(`verification_requests?select=status,days_band,file_paths,extracted,documents_deleted_at&id=eq.${req.id}`);
  expect(after).toMatchObject({ status: "approved", days_band: "60-119", file_paths: [], extracted: null });
  expect(after.documents_deleted_at).not.toBeNull();

  await anonPage.goto(`/providers/${provider}`);
  await expect(anonPage.getByRole("heading", { name: "Yossi M." })).toBeVisible();
  await expect(anonPage.getByText("מילואימניק מאומת")).toBeVisible();
  await expect(anonPage.getByText("instagram.com/yossi.electric")).toBeVisible();
  await expect(anonPage.getByText("הורדת קורות חיים")).toHaveCount(0); // signed-in only
  await anon.close();

  await page.context().clearCookies();
  await signInWithPhone(page, "050-000-0005");
  await expectPath(page, "/home");
  await expect(page.getByRole("link", { name: /100\s*קרדיטים/ })).toBeVisible();
  await page.goto("/account");
  await expect(page.getByText("מאומת ✓")).toBeVisible();
  await expect(page.getByText("60+ ימי מילואים מאז 7 באוקטובר 2023")).toBeVisible();
});

test("rejection with a reason, then upload again", async ({ page }) => {
  await signInWithPhone(page, "050-000-0008");
  await completeWelcome(page, "Eli Cohen", ["provider"]);
  await page.locator('input[type="file"]').setInputFiles({ name: "short.pdf", mimeType: "application/pdf", buffer: PDF });
  await page.getByRole("button", { name: "המשך" }).click();
  await expect(page.getByText("ספרנו 10 ימים")).toBeVisible();
  await expect(page.getByText("פחות מ-30 ימים")).toBeVisible();
  await page.getByLabel("משהו לא נכון? כתבו לבודק (לא חובה)").fill("יש לי עוד טפסים, אעלה");
  await page.getByRole("button", { name: "אישור ושליחה לאימות" }).click();
  await expectPath(page, "/provider/onboarding/cv");

  await page.context().clearCookies();
  await signInWithPhone(page, "050-000-0006");
  await page.goto("/admin/verifications");
  await page.getByRole("link", { name: "בדיקה", exact: true }).click();
  await expect(page.getByText("הערת המשתמש: יש לי עוד טפסים, אעלה")).toBeVisible();
  await page.getByText("דחייה", { exact: true }).click();
  await page.getByLabel("סיבת הדחייה").selectOption("under_30_days");
  await page.getByRole("button", { name: "שמירת ההחלטה" }).click();
  await expectPath(page, "/admin/verifications");

  await page.context().clearCookies();
  await signInWithPhone(page, "050-000-0008");
  await page.goto("/account");
  await expect(page.getByText("האימות נדחה")).toBeVisible();
  await page.getByRole("link", { name: "לפרטים ולהעלאה מחדש" }).click();
  await expect(page.getByText("האימות הקודם נדחה: פחות מ-30 ימי מילואים")).toBeVisible();
  await expect(page.getByText("העלאת טופס 3010")).toBeVisible();
});

test("spouse invite: link, sign-up, proof of marriage, admin approval", async ({ page, browser }) => {
  await signInWithPhone(page, "050-000-0005");
  await page.goto("/account");
  await page.getByLabel("שם בן/בת הזוג").fill("Noa Mizrahi");
  await page.getByLabel("טלפון נייד").fill("050-000-0007");
  await page.getByRole("button", { name: "יצירת הזמנה" }).click();
  await expect(page.getByRole("link", { name: "שליחה ב-WhatsApp" })).toHaveAttribute("href", /wa\.me\/972500000007/);
  const inviteUrl = (await page.locator("p[dir=ltr]", { hasText: "/invite/" }).textContent())!.trim();

  const ctx = await browser.newContext();
  const spouse = await ctx.newPage();
  await spouse.goto(new URL(inviteUrl).pathname);
  await expect(spouse.getByText("Yossi M. הזמין/ה אותך")).toBeVisible();
  await spouse.getByRole("link", { name: "כניסה או הרשמה" }).click();
  await expect(spouse).toHaveURL(/\/login\?next=/);
  await enterPhoneAndCode(spouse, "050-000-0007");
  await expectPath(spouse, "/onboarding/welcome");
  await expect(spouse.getByText("הוזמנת כבן/בת זוג")).toBeVisible();
  await completeWelcome(spouse, "Noa Mizrahi", ["provider"]);
  await expect(spouse).toHaveURL(/\/invite\//);
  await spouse.getByRole("button", { name: "אישור ההזמנה" }).click();
  await expectPath(spouse, "/provider/onboarding/proof");
  await expect(spouse.getByRole("heading", { name: "אישור זוגיות" })).toBeVisible();
  await spouse.locator('input[type="file"]').setInputFiles({ name: "marriage.pdf", mimeType: "application/pdf", buffer: PDF });
  await spouse.getByRole("button", { name: "שליחה לאימות" }).click();
  await expectPath(spouse, "/provider/onboarding/cv");

  await page.reload();
  await expect(page.getByText("Noa Mizrahi: ההזמנה התקבלה")).toBeVisible();

  await page.context().clearCookies();
  await signInWithPhone(page, "050-000-0006");
  await page.goto("/admin/verifications");
  await page.getByRole("link", { name: "בדיקה", exact: true }).click();
  await expect(page.getByText("מילואימניק מאומת")).toBeVisible();
  await page.getByRole("button", { name: "שמירת ההחלטה" }).click();
  await expectPath(page, "/admin/verifications");

  await spouse.goto("/account");
  await expect(spouse.getByText("מאומת ✓")).toBeVisible();
  await expect(spouse.getByText("בן/בת זוג של מילואימניק מאומת")).toBeVisible();
  await expect(spouse.locator("dd", { hasText: "100" })).toBeVisible();
  await ctx.close();
});
