"use client";

import { useState, useTransition } from "react";
import { saveNotificationPrefs } from "./actions";

type Prefs = { job_alerts: "instant" | "off"; whatsapp: boolean; email_digest: boolean };

export function NotificationPrefs({ initial, provider }: { initial: Prefs; provider: boolean }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    start(() => saveNotificationPrefs(next));
  };
  const row = "flex items-center justify-between gap-3 text-sm";
  const box = "size-5 accent-[var(--accent-strong)]";
  return (
    <div className="flex flex-col gap-3" aria-busy={pending}>
      {provider ? (
        <label className={row}>התראה על עבודות חדשות שמתאימות לי
          <input type="checkbox" className={box} checked={prefs.job_alerts !== "off"} onChange={(e) => set({ job_alerts: e.target.checked ? "instant" : "off" })} />
        </label>
      ) : null}
      <label className={row}>הודעות WhatsApp
        <input type="checkbox" className={box} checked={prefs.whatsapp} onChange={(e) => set({ whatsapp: e.target.checked })} />
      </label>
      <label className={row}>סיכום במייל
        <input type="checkbox" className={box} checked={prefs.email_digest} onChange={(e) => set({ email_digest: e.target.checked })} />
      </label>
      <p className="text-xs text-muted">התראות בתוך האפליקציה תמיד פעילות. הודעות WhatsApp ומייל יתחילו לצאת בשלב הבא של הבנייה.</p>
    </div>
  );
}
