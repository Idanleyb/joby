"use client";

import { useActionState, useState } from "react";
import { submitWith } from "@/components/use-form-submit";
import { applyToJob, type ApplyState } from "../actions";
import { Button, Field, FormError, Input } from "@/components/ui";

export function ApplyForm({ jobId, cost, balance, cards }: { jobId: string; cost: number; balance: number; cards: { id: string; title: string }[] }) {
  const [state, action, pending] = useActionState<ApplyState, FormData>(applyToJob.bind(null, jobId), {});
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [confirming, setConfirming] = useState(false);

  if (!open) return <Button type="button" onClick={() => setOpen(true)}>הגשת מועמדות · {cost} קרדיטים</Button>;

  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5" noValidate>
      <h2 className="text-lg font-bold">הגשת מועמדות</h2>
      <p className="rounded-xl bg-accent/10 p-3 text-sm">ההגשה עולה <b>{cost} קרדיטים</b> (יש לך {balance}). הם חוזרים אם העבודה נסגרת בלי גיוס, או אם המפרסם לא פותח את הפנייה 30 ימים. <a href="/how-it-works#credits" target="_blank" className="underline">חוקי הקרדיטים</a></p>
      <Field label="למה את/ה מתאים/ה?" htmlFor="pitch" hint={`${pitch.length}/1000 · לפחות 50 תווים`}>
        <textarea id="pitch" name="pitch" maxLength={1000} value={pitch} onChange={(e) => { setPitch(e.target.value); setConfirming(false); }}
          className="min-h-32 rounded-xl border border-border bg-surface p-3" placeholder="ניסיון רלוונטי, איך תיגש/י לעבודה, שאלות למפרסם…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="הצעת מחיר ₪ (לא חובה)" htmlFor="price"><Input id="price" name="price" inputMode="numeric" dir="ltr" className="text-left" /></Field>
        <Field label="זמינ/ה מ- (לא חובה)" htmlFor="availableFrom"><Input id="availableFrom" name="availableFrom" type="date" /></Field>
      </div>
      {cards.length ? (
        <Field label="צירוף שירות מהפרופיל (לא חובה)" htmlFor="serviceCard">
          <select id="serviceCard" name="serviceCard" className="min-h-12 rounded-xl border border-border bg-surface px-3">
            <option value="">בלי</option>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </Field>
      ) : null}
      <FormError message={state.error} />
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-xl border border-accent/50 bg-accent/10 p-3">
          <p className="text-sm">ההגשה עולה <b>{cost} קרדיטים</b>. יתרה אחרי: <b>{balance - cost}</b>.<br />אם העבודה תיסגר בלי גיוס, או שהמפרסם לא יפתח את הפנייה תוך 30 ימים, הקרדיטים יחזרו אליך.</p>
          <Button type="submit" disabled={pending}>{pending ? "שולחים…" : "אישור ושליחה"}</Button>
        </div>
      ) : (
        <Button type="button" disabled={pitch.trim().length < 50} onClick={() => setConfirming(true)}>המשך</Button>
      )}
      <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>ביטול</Button>
    </form>
  );
}
