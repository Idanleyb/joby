import "server-only";
import nodemailer from "nodemailer";

/**
 * Outgoing email over SMTP (any provider: Gmail with an app password, Resend, Brevo…).
 * Settings: SMTP_HOST, SMTP_PORT (465 = TLS, 587 = STARTTLS), SMTP_USER, SMTP_PASS, MAIL_FROM.
 * Without SMTP_HOST, nothing is sent and callers fall back to a copyable link.
 */
export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }): Promise<boolean> {
  if (!mailConfigured()) return false;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER ?? "Joby <no-reply@joby.local>";
  try {
    await transport.sendMail({ from, ...msg });
    return true;
  } catch (e) {
    console.error("[mail] send failed", e instanceof Error ? e.message : e);
    return false;
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The default Hebrew invitation text; [שם] is replaced with the invitee's name. */
export const DEFAULT_ADMIN_INVITE_TEXT = "היי [שם], קיבלת הזמנה מ-JOBY להיות אדמין במערכת. לאישור ההזמנה היכנס/י בלינק הזה:";

export function adminInviteEmail(opts: { name: string; link: string; message?: string; inviter?: string | null }) {
  const body = (opts.message?.trim() || DEFAULT_ADMIN_INVITE_TEXT).replaceAll("[שם]", opts.name);
  const footer = `${opts.inviter ? `ההזמנה נשלחה על ידי ${opts.inviter}. ` : ""}הקישור בתוקף 7 ימים. אם לא ציפית להזמנה הזו, אפשר להתעלם מהמייל.`;
  const text = `${body}\n\n${opts.link}\n\n${footer}`;
  const html = `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;direction:rtl;text-align:right">
<tr><td style="padding:24px 28px 8px;font-size:22px;font-weight:bold;color:#111">Joby</td></tr>
<tr><td style="padding:8px 28px;font-size:16px;line-height:1.7;color:#111">${esc(body).replace(/\n/g, "<br>")}</td></tr>
<tr><td style="padding:16px 28px"><a href="${esc(opts.link)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">לאישור ההזמנה</a></td></tr>
<tr><td style="padding:0 28px 8px;font-size:12px;color:#666;word-break:break-all">${esc(opts.link)}</td></tr>
<tr><td style="padding:8px 28px 24px;font-size:12px;color:#666">${esc(footer)}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject: "הוזמנת להיות אדמין ב-Joby", text, html };
}
