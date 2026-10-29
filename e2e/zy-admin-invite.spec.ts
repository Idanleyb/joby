import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { completeWelcome, enterPhoneAndCode, serviceRest, signInWithPhone, userIdByPhone } from "./helpers";

// Runs after provider.spec and jobs.spec, which set up 050-000-0006.
// Admin 050-000-0006 invites a new admin by email; the invitee (050-000-0009) signs up and accepts.
// E2E_MAIL_LOG: optional path to a local SMTP sink's log (aiosmtpd Debugging) to check the email itself.
const ADMIN = { local: "050-000-0006", e164: "+972500000006" };
const INVITEE = { local: "050-000-0009", e164: "+972500000009" };
const EMAIL = `rina.${Date.now()}@example.com`;

function decodeQuotedPrintable(raw: string) {
  const bytes = raw.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return Buffer.from(bytes, "latin1").toString("utf8");
}

test("an admin invites a new admin by email, who signs up and accepts", async ({ page, browser, baseURL }) => {
  await signInWithPhone(page, ADMIN.local);
  if (page.url().includes("/onboarding/welcome")) await completeWelcome(page, "Ops Admin", []);
  const adminId = await userIdByPhone(ADMIN.e164);
  await serviceRest("admins?on_conflict=user_id", { method: "POST", body: JSON.stringify({ user_id: adminId, role: "admin" }), headers: { Prefer: "resolution=merge-duplicates" } });

  // Leftovers from an earlier, interrupted run.
  const prior = await serviceRest(`profiles?select=id&phone=eq.${encodeURIComponent(INVITEE.e164)}`);
  if (prior[0]) await serviceRest(`admins?user_id=eq.${prior[0].id}`, { method: "DELETE" });
  await serviceRest("admin_invites?full_name=eq.Rina%20Invite&status=eq.pending", { method: "PATCH", body: JSON.stringify({ status: "revoked" }) });

  await page.goto("/admin");
  await page.getByRole("link", { name: "אדמינים" }).click();
  await expect(page.getByRole("heading", { name: "הזמנת אדמין" })).toBeVisible();
  await expect(page.getByLabel("נוסח המייל")).toHaveValue(/היי \[שם\], קיבלת הזמנה מ-JOBY להיות אדמין במערכת/);
  await page.getByLabel("שם", { exact: true }).fill("Rina Invite");
  await page.getByLabel("מייל", { exact: true }).fill(EMAIL);
  await page.getByRole("button", { name: "שליחת הזמנה" }).click();
  await expect(page.getByText(`ההזמנה נשלחה למייל ${EMAIL}.`)).toBeVisible();
  const link = (await page.getByTestId("invite-link").textContent())!.trim();
  expect(link).toMatch(/\/invite\/admin\/[0-9a-f]{48}$/);
  await expect(page.getByText(EMAIL, { exact: true })).toBeVisible(); // listed under pending invitations

  const log = process.env.E2E_MAIL_LOG;
  if (log && existsSync(log)) {
    await expect.poll(() => readFileSync(log, "utf8").includes(EMAIL)).toBe(true);
    const mail = decodeQuotedPrintable(readFileSync(log, "utf8").split(EMAIL).pop()!);
    expect(mail).toContain("היי Rina Invite, קיבלת הזמנה מ-JOBY להיות אדמין במערכת.");
    expect(mail).toContain(link);
  }

  // The invitee opens the link in their own browser.
  const ctx = await browser.newContext({ baseURL, locale: "he-IL" });
  const invitee = await ctx.newPage();
  await invitee.goto(new URL(link).pathname);
  await expect(invitee.getByRole("heading", { name: "היי Rina Invite," })).toBeVisible();
  await expect(invitee.getByText("קיבלת הזמנה מ-JOBY להיות אדמין במערכת")).toBeVisible();
  await invitee.getByRole("link", { name: "כניסה או הרשמה" }).click();
  await enterPhoneAndCode(invitee, INVITEE.local);
  if (invitee.url().includes("/onboarding/welcome")) await completeWelcome(invitee, "Rina Invite", []);
  await expect(invitee).toHaveURL(/\/invite\/admin\//);
  await invitee.getByRole("button", { name: "אישור ההזמנה" }).click();
  await expect(invitee).toHaveURL(/\/admin$/);
  await expect(invitee.getByRole("heading", { name: "לוח בקרה" })).toBeVisible();
  await ctx.close();

  // The inviter sees the new admin and gets a notice; the link no longer works.
  await page.goto("/admin/admins");
  const active = page.getByRole("region", { name: "אדמינים פעילים" });
  await expect(active.getByText("Rina Invite · אדמין")).toBeVisible();
  await expect(page.getByRole("region", { name: "הזמנות ממתינות" }).getByText(EMAIL)).toHaveCount(0);
  await page.goto("/notifications");
  await expect(page.getByText("אישר/ה את ההזמנה").first()).toBeVisible();

  // Clean up so the run can repeat: remove the new admin through the UI.
  await page.goto("/admin/admins");
  const card = page.getByRole("region", { name: "אדמינים פעילים" }).locator("div.rounded-2xl", { hasText: "Rina Invite · אדמין" });
  await card.getByRole("button", { name: "הסרת הרשאה" }).click();
  await card.getByRole("button", { name: "הסרה" }).click();
  await expect(page.getByRole("region", { name: "אדמינים פעילים" }).getByText("Rina Invite · אדמין")).toHaveCount(0);
  const inviteeId = await userIdByPhone(INVITEE.e164);
  expect(await serviceRest(`admins?user_id=eq.${inviteeId}`)).toHaveLength(0);
});
