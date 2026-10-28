import { formatIlPhone } from "@/lib/phone";
import { cx } from "@/components/ui";

export type Contact = { full_name: string | null; phone: string | null; email: string | null };

/** Revealed contact details with call / WhatsApp. Demo users have no real details. */
export function ContactCard({ c, className }: { c: Contact; className?: string }) {
  if (!c.phone) {
    return (
      <p className={cx("rounded-xl bg-background p-3 text-sm", className)}>
        <bdi>{c.full_name}</bdi> · <span className="text-muted">משתמש דמו — אין פרטי קשר אמיתיים. בחשבון אמיתי כאן יופיעו טלפון, מייל וכפתורי התקשרות ו-WhatsApp.</span>
      </p>
    );
  }
  return (
    <div className={cx("flex flex-col gap-2 rounded-xl bg-background p-3 text-sm", className)}>
      <span><bdi>{c.full_name}</bdi> · <span dir="ltr">{formatIlPhone(c.phone)}</span>{c.email && !c.email.endsWith(".invalid") ? <> · <span dir="ltr">{c.email}</span></> : null}</span>
      <div className="flex gap-4">
        <a href={`tel:${c.phone}`} className="font-semibold underline">📞 התקשרות</a>
        <a href={`https://wa.me/${c.phone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">WhatsApp</a>
      </div>
    </div>
  );
}
