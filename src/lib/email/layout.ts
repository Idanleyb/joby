/**
 * One Hebrew, right-to-left email layout for every lifecycle email (PRD v1.7).
 * Pure functions (no I/O) so they can be unit-tested.
 */

/** A block of the email body. Strings are escaped; **double asterisks** make bold text. */
export type Block =
  | string
  | { bullets: string[] }
  | { numbered: string[] }
  | { note: string }; // smaller grey text

export type EmailContent = {
  subject: string;
  preheader: string;
  greeting?: string;           // "היי {name}," — omitted for internal alerts
  blocks: Block[];
  button?: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export type Footer = { site: string; supportWhatsapp: string | null; settingsHref: string };

export type RenderedEmail = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Escape, then turn **x** into <b>x</b>. */
const rich = (s: string) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\u2066(.*?)\u2069/g, '<span dir="ltr" style="unicode-bidi:isolate">$1</span>') // phones, emails
    .replace(/\n/g, "<br>");
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "$1");

const P = "padding:6px 28px;font-size:16px;line-height:1.7;color:#111";

function blockHtml(b: Block): string {
  if (typeof b === "string") return `<tr><td style="${P}">${rich(b)}</td></tr>`;
  if ("note" in b) return `<tr><td style="padding:6px 28px;font-size:13px;line-height:1.6;color:#5E6460">${rich(b.note)}</td></tr>`;
  const tag = "bullets" in b ? "ul" : "ol";
  const items = ("bullets" in b ? b.bullets : b.numbered).map((i) => `<li style="margin:0 0 6px">${rich(i)}</li>`).join("");
  return `<tr><td style="${P}"><${tag} style="margin:0;padding:0 20px 0 0">${items}</${tag}></td></tr>`;
}

function blockText(b: Block): string {
  if (typeof b === "string") return plain(b);
  if ("note" in b) return plain(b.note);
  if ("bullets" in b) return b.bullets.map((i) => `• ${plain(i)}`).join("\n");
  return b.numbered.map((i, n) => `${n + 1}. ${plain(i)}`).join("\n");
}

export function renderEmail(c: EmailContent, f: Footer): RenderedEmail {
  const support = f.supportWhatsapp
    ? `שאלות? פשוט משיבים למייל הזה או כותבים לנו <a href="${esc(f.supportWhatsapp)}" style="color:#5E6460">בוואטסאפ</a>.`
    : "שאלות? פשוט משיבים למייל הזה.";
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(c.subject)}</title></head>
<body style="margin:0;background:#F7F7F6;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(c.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F6;padding:24px 0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E5E5E5;border-radius:12px;direction:rtl;text-align:right">
<tr><td style="padding:24px 28px 8px;font-size:22px;font-weight:bold;color:#111">Joby</td></tr>
${c.greeting ? `<tr><td style="${P}">${esc(c.greeting)}</td></tr>` : ""}
${c.blocks.map(blockHtml).join("\n")}
${c.button ? `<tr><td style="padding:18px 28px 6px"><a href="${esc(c.button.href)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px">${esc(c.button.label)}</a></td></tr>` : ""}
${c.secondary ? `<tr><td style="padding:6px 28px"><a href="${esc(c.secondary.href)}" style="color:#111;font-size:15px">${esc(c.secondary.label)}</a></td></tr>` : ""}
<tr><td style="padding:20px 28px 6px"><hr style="border:none;border-top:1px solid #E5E5E5;margin:0"></td></tr>
<tr><td style="padding:6px 28px 24px;font-size:12px;line-height:1.7;color:#5E6460">Joby — הזירה של המילואימניקים. נבנה כדי לעזור למשרתי המילואים ובני ובנות הזוג שלהם לחזור לעבודה.<br>${support}<br><a href="${esc(f.settingsHref)}" style="color:#5E6460">הגדרות התראות</a></td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    c.greeting,
    ...c.blocks.map(blockText),
    c.button ? `${c.button.label}: ${c.button.href}` : null,
    c.secondary ? `${c.secondary.label}: ${c.secondary.href}` : null,
    "—",
    "Joby — הזירה של המילואימניקים.",
    f.supportWhatsapp ? `שאלות? משיבים למייל הזה או בוואטסאפ: ${f.supportWhatsapp}` : "שאלות? משיבים למייל הזה.",
    `הגדרות התראות: ${f.settingsHref}`,
  ].filter(Boolean).join("\n\n");

  return { subject: c.subject, html, text };
}
