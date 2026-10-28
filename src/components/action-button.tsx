"use client";

import { useState, useTransition } from "react";
import { Button, cx } from "@/components/ui";

export type ActionResult = { error?: string } | void;

/**
 * Runs a bound server action. With `confirm`, the first click opens an inline
 * confirmation (never a browser dialog), the second runs the action.
 */
export function ActionButton({ action, label, pendingLabel, confirm, confirmLabel, variant = "secondary", className }: {
  action: () => Promise<ActionResult>; label: string; pendingLabel?: string; confirm?: string; confirmLabel?: string;
  variant?: "primary" | "secondary" | "ghost"; className?: string;
}) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      setError(undefined);
      const r = await action();
      if (r && r.error) setError(r.error);
      setAsking(false);
    });

  return (
    <div className={cx("flex flex-col gap-2", className)}>
      {asking ? (
        <div className="flex flex-col gap-2 rounded-xl border border-action-border bg-action p-3">
          <p className="text-sm">{confirm}</p>
          <div className="flex gap-2">
            <Button type="button" onClick={run} disabled={pending} className="flex-1">{pending ? pendingLabel ?? "רגע…" : confirmLabel ?? "אישור"}</Button>
            <Button type="button" variant="ghost" onClick={() => setAsking(false)} disabled={pending}>ביטול</Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant={variant} disabled={pending} onClick={() => (confirm ? setAsking(true) : run())}>
          {pending ? pendingLabel ?? "רגע…" : label}
        </Button>
      )}
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}
