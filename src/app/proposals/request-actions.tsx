"use client";

import { useState, useTransition } from "react";
import { respondRequest } from "@/app/requests/actions";
import { Button } from "@/components/ui";

const REASONS = [["busy", "אין לי זמינות כרגע"], ["area", "מחוץ לאזור שלי"], ["field", "לא בתחום שלי"], ["price", "התקציב לא מתאים"], ["other", "אחר"]] as const;

/** Approve for 2 credits (with the balance after) or decline with an optional reason. */
export function RequestActions({ requestId, cost, balance }: { requestId: string; cost: number; balance: number }) {
  const [mode, setMode] = useState<"idle" | "approve" | "decline">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const run = (approve: boolean) => start(async () => {
    setError(undefined);
    const r = await respondRequest(requestId, approve, approve ? undefined : reason);
    if (r.error) setError(r.error);
  });

  if (balance < cost && mode !== "decline") {
    return (
      <div className="flex flex-col gap-2">
        <p className="rounded-xl bg-background p-3 text-sm">כדי לאשר צריך {cost} קרדיטים ויש לך {balance}. בתקופת הבטא, לקרדיטים נוספים פנו לתמיכה.</p>
        <Button type="button" variant="ghost" onClick={() => setMode("decline")}>דחיית הפנייה</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {mode === "approve" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-accent/50 bg-accent/10 p-3">
          <p className="text-sm">האישור עולה <b>{cost} קרדיטים</b> (יתרה אחרי: <b>{balance - cost}</b>). ייחשפו הטלפון והמייל של שניכם, ובעוד 3 ימים נבקש משוב.</p>
          <div className="flex gap-2">
            <Button type="button" className="flex-1" disabled={pending} onClick={() => run(true)}>{pending ? "רגע…" : "אישור"}</Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setMode("idle")}>ביטול</Button>
          </div>
        </div>
      ) : mode === "decline" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">סיבה (לא חובה)
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-11 rounded-xl border border-border bg-surface px-3 font-normal">
              <option value="">בלי סיבה</option>
              {REASONS.map(([v, l]) => <option key={v} value={l}>{l}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" disabled={pending} onClick={() => run(false)}>{pending ? "רגע…" : "דחייה"}</Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setMode("idle")}>ביטול</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" onClick={() => setMode("approve")}>אישור · {cost} קרדיטים</Button>
          <Button type="button" variant="secondary" onClick={() => setMode("decline")}>לא מתאים לי</Button>
        </div>
      )}
      {error ? <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  );
}
