import "server-only";
import { sendMail } from "@/lib/mail";

/**
 * Sends one lifecycle email. With a Resend key it uses the Resend API, so the email
 * carries tags (template ID) and Resend's open/click events can be matched back to
 * the outbox row (/api/resend/webhook). Without it, plain SMTP (no stats).
 * The key: RESEND_API_KEY, or SMTP_PASS when SMTP_HOST is smtp.resend.com (same key).
 * Replies go to SUPPORT_EMAIL — the sending subdomain has no inbox.
 */
export function resendKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  return process.env.SMTP_HOST === "smtp.resend.com" ? process.env.SMTP_PASS : undefined;
}

export async function sendTracked(msg: {
  to: string; subject: string; html: string; text: string; tags: Record<string, string>;
}): Promise<{ ok: boolean; id: string | null; error?: string }> {
  const replyTo = process.env.SUPPORT_EMAIL || undefined;
  const key = resendKey();
  if (!key) {
    const ok = await sendMail({ to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, replyTo });
    return { ok, id: null, error: ok ? undefined : "smtp send failed" };
  }
  const from = process.env.MAIL_FROM ?? "Joby <hello@mail.joby-ai.com>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      tags: Object.entries(msg.tags).map(([name, value]) => ({ name, value: value.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256) })),
    }),
  });
  if (!res.ok) return { ok: false, id: null, error: `resend ${res.status}: ${(await res.text()).slice(0, 300)}` };
  const body = (await res.json()) as { id?: string };
  return { ok: true, id: body.id ?? null };
}
