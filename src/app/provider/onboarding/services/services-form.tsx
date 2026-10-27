"use client";

import { useActionState, useTransition } from "react";
import { addServiceCard, deleteServiceCard, finishServices, type CardState } from "./actions";
import { Button, Card, Field, FormError, Input } from "@/components/ui";

export type CardRow = { id: string; title: string; sub: string; price_from: number | null; unit: string; mode: string; description: string | null };
export const UNIT_LABEL: Record<string, string> = { job: "לעבודה", hour: "לשעה", day: "ליום", project: "לפרויקט" };
export const MODE_LABEL: Record<string, string> = { onsite: "בשטח", remote: "מרחוק", both: "בשטח ומרחוק" };

export function ServicesForm({ cards, subs, defaultMode }: { cards: CardRow[]; subs: { id: number; name_he: string }[]; defaultMode: string }) {
  const [state, action, adding] = useActionState<CardState, FormData>(addServiceCard, {});
  const [pending, start] = useTransition();
  const full = cards.length >= 3;

  return (
    <div className="flex flex-col gap-5">
      {cards.map((c) => (
        <Card key={c.id} className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="font-bold">{c.title}</p>
            <p className="text-sm text-muted">{c.sub} · {MODE_LABEL[c.mode]}</p>
            <p className="text-sm font-semibold">{c.price_from ? `החל מ-₪${c.price_from.toLocaleString("he-IL")} ${UNIT_LABEL[c.unit]}` : "הצעת מחיר לפי בקשה"}</p>
          </div>
          <Button type="button" variant="ghost" className="min-h-0 px-2 text-sm" disabled={pending} onClick={() => start(() => deleteServiceCard(c.id))}>מחיקה</Button>
        </Card>
      ))}

      {!full ? (
        <form key={state.ok ?? 0} action={action} className="flex flex-col gap-4 rounded-2xl border border-dashed border-border p-5" noValidate>
          <p className="font-semibold">הוספת שירות {cards.length ? `(${cards.length}/3)` : ""}</p>
          <Field label="שם השירות" htmlFor="title"><Input id="title" name="title" maxLength={60} placeholder="למשל: התקנת עמדת טעינה" /></Field>
          <Field label="תחום" htmlFor="sub">
            <select id="sub" name="sub" className="min-h-12 rounded-xl border border-border bg-surface px-3">
              {subs.map((s) => <option key={s.id} value={s.id}>{s.name_he}</option>)}
            </select>
          </Field>
          <Field label="תיאור קצר (לא חובה)" htmlFor="description">
            <textarea id="description" name="description" maxLength={300} className="min-h-20 rounded-xl border border-border bg-surface p-3" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="מחיר התחלתי (₪)" htmlFor="price"><Input id="price" name="price" inputMode="numeric" dir="ltr" className="text-left" /></Field>
            <Field label="יחידה" htmlFor="unit">
              <select id="unit" name="unit" className="min-h-12 rounded-xl border border-border bg-surface px-3">
                {Object.entries(UNIT_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="quote" className="size-5 accent-[var(--accent-strong)]" /> הצעת מחיר לפי בקשה (בלי מחיר)
          </label>
          <Field label="איפה" htmlFor="mode">
            <select id="mode" name="mode" defaultValue={defaultMode} className="min-h-12 rounded-xl border border-border bg-surface px-3">
              {Object.entries(MODE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <FormError message={state.error} />
          <Button type="submit" variant="secondary" disabled={adding}>{adding ? "מוסיפים…" : "הוספת השירות"}</Button>
        </form>
      ) : null}

      <Button type="button" disabled={pending} onClick={() => start(() => finishServices())}>
        {cards.length ? "המשך" : "דילוג — אוסיף אחר כך"}
      </Button>
    </div>
  );
}
