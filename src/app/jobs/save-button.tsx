"use client";

import { useOptimistic, useTransition } from "react";
import { toggleSave } from "./actions";
import { cx } from "@/components/ui";

export function SaveButton({ jobId, saved }: { jobId: string; saved: boolean }) {
  const [on, setOn] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "הסרה מהשמורות" : "שמירה"}
      onClick={() => start(async () => { setOn(!on); await toggleSave(jobId, !on); })}
      className={cx("self-start rounded-lg px-2 py-1 text-sm font-semibold hover:bg-background", on ? "text-foreground" : "text-muted")}
    >
      {on ? "★ שמורה" : "☆ שמירה"}
    </button>
  );
}
