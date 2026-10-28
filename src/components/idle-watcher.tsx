"use client";

import { useEffect, useState } from "react";
import { IDLE_MS, IDLE_WARNING_MS, LAST_ACTIVE_COOKIE } from "@/lib/idle";

const read = () => Number(document.cookie.match(new RegExp(`(?:^|; )${LAST_ACTIVE_COOKIE}=(\\d+)`))?.[1] ?? 0);
const write = (t: number) => {
  document.cookie = `${LAST_ACTIVE_COOKIE}=${t}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
};

/**
 * Signs the user out after IDLE_MS without activity in any tab (src/lib/idle.ts).
 * Shows a warning two minutes before, with a button to stay signed in.
 */
export function IdleWatcher() {
  const [warn, setWarn] = useState(false);

  useEffect(() => {
    if (!read()) write(Date.now());
    let lastWrite = 0;
    const activity = () => {
      const now = Date.now();
      if (now - lastWrite > 30_000) { write(now); lastWrite = now; }
      setWarn(false);
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, activity, { passive: true }));

    let signingOut = false;
    const check = async () => {
      const idle = Date.now() - read();
      if (idle > IDLE_MS && !signingOut) {
        signingOut = true;
        try { await fetch("/auth/signout", { method: "POST", redirect: "manual" }); } catch { /* signed out on the next request anyway */ }
        const next = location.pathname + location.search;
        // Full page load on purpose, so the layout (menu, header) drops the old session.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign(`/login?reason=idle${next !== "/" ? `&next=${encodeURIComponent(next)}` : ""}`);
      } else {
        setWarn(idle > IDLE_MS - IDLE_WARNING_MS);
      }
    };
    const timer = window.setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      events.forEach((e) => window.removeEventListener(e, activity));
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!warn) return null;
  return (
    <div role="alertdialog" aria-label="ניתוק בגלל חוסר פעילות" className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md flex-col gap-3 rounded-2xl border border-accent bg-surface p-4 shadow-lg md:bottom-6">
      <p className="text-sm">לא הייתה פעילות כבר זמן רב. מטעמי אבטחה ננתק אותך בעוד כשתי דקות.</p>
      <button type="button" onClick={() => { write(Date.now()); setWarn(false); }}
        className="min-h-11 rounded-xl bg-brand px-4 font-semibold text-brand-contrast">אני עדיין כאן</button>
    </div>
  );
}
