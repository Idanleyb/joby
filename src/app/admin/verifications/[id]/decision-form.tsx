"use client";

import { submitWith } from "@/components/use-form-submit";
import { useActionState, useState } from "react";
import { decide, type DecideState } from "./actions";
import { Button, Field, FormError, Input } from "@/components/ui";

const REJECT_3010 = [
  ["unreadable", "הקבצים לא קריאים"],
  ["name_mismatch", "השם לא תואם לחשבון"],
  ["under_30_days", "פחות מ-30 ימים"],
  ["not_3010", "לא אישור מילואים"],
  ["suspected_tampering", "חשד לשינוי במסמך"],
  ["other", "אחר (פרטו בהערה)"],
];
const REJECT_SPOUSE = [
  ["unreadable", "הקבצים לא קריאים"],
  ["not_marriage_proof", "המסמך אינו מוכיח זוגיות"],
  ["name_mismatch", "השמות לא תואמים"],
  ["other", "אחר (פרטו בהערה)"],
];

export function DecisionForm({ id, kind, days }: { id: string; kind: string; days: number | null }) {
  const [state, action, pending] = useActionState<DecideState, FormData>(decide, {});
  const [decision, setDecision] = useState("approved");
  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="id" value={id} />
      <fieldset className="grid grid-cols-3 gap-2 text-sm">
        {[["approved", "אישור"], ["more_info", "בקשת מידע"], ["rejected", "דחייה"]].map(([v, l]) => (
          <label key={v} className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-border p-3 font-semibold has-[:checked]:border-foreground has-[:checked]:bg-action">
            <input type="radio" name="decision" value={v} checked={decision === v} onChange={() => setDecision(v)} className="sr-only" />
            {l}
          </label>
        ))}
      </fieldset>
      {decision === "approved" && kind === "form_3010" ? (
        <Field label="סך הימים (אחרי בדיקה)" htmlFor="days" hint="נדרשים 30 לפחות. נשמר רק הטווח (30+/60+/120+).">
          <Input id="days" name="days" inputMode="numeric" defaultValue={days ?? ""} className="max-w-32" />
        </Field>
      ) : null}
      {decision === "rejected" ? (
        <Field label="סיבת הדחייה" htmlFor="reason">
          <select id="reason" name="reason" className="min-h-12 rounded-xl border border-border bg-surface px-3">
            {(kind === "spouse" ? REJECT_SPOUSE : REJECT_3010).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      ) : null}
      <Field label={decision === "more_info" ? "מה חסר? (יוצג למשתמש)" : "הערה (לא חובה)"} htmlFor="note">
        <textarea id="note" name="note" maxLength={500} className="min-h-20 rounded-xl border border-border bg-surface p-3" />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "שמירת ההחלטה"}</Button>
      <p className="text-xs text-muted">באישור או בדחייה המסמכים נמחקים מיד ונשמרת רק התוצאה.</p>
    </form>
  );
}
