"use client";

import { useTransition } from "react";
import { switchMode } from "@/app/mode-actions";
import { cx } from "@/components/ui";
import type { Mode } from "@/lib/mode";

/** "Working / Hiring" switch, like Fiverr's "Switch to selling". */
export function RoleSwitch({ mode }: { mode: Mode }) {
  const [pending, start] = useTransition();
  const btn = (m: Mode, label: string) => (
    <button type="button" aria-pressed={mode === m} disabled={pending}
      onClick={() => mode !== m && start(() => switchMode(m))}
      className={cx("rounded-lg px-3 py-1.5", mode === m ? "bg-surface shadow-sm" : "text-muted")}>
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="מצב" className="flex rounded-xl bg-background p-1 text-sm font-semibold">
      {btn("work", "עובד/ת")}
      {btn("hire", "מגייס/ת")}
    </div>
  );
}
