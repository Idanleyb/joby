"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export type HomeTab = { id: string; label: string; panel: ReactNode };

/** Segmented tabs for "How it works" on the home page (reservists / spouses / hiring). Arrow keys move between tabs. */
export function HomeTabs({ tabs, label }: { tabs: HomeTab[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    // Right-to-left: the arrow pointing left moves to the next tab.
    const step = e.key === "ArrowLeft" ? 1 : e.key === "ArrowRight" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = tabs[(i + step + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`${base}-tab-${next.id}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 self-start rounded-full bg-chip p-1">
        {tabs.map((t, i) => {
          const on = t.id === current.id;
          return (
            <button
              key={t.id}
              id={`${base}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={`${base}-panel`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`min-h-11 rounded-full px-5 font-semibold transition sm:px-6 ${on ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div id={`${base}-panel`} role="tabpanel" aria-labelledby={`${base}-tab-${current.id}`}>
        {current.panel}
      </div>
    </div>
  );
}
