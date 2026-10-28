"use client";

import { useActionState, useState } from "react";
import { submitWith } from "@/components/use-form-submit";
import { sendRequest, type RequestState } from "@/app/requests/actions";
import { IL_CITIES } from "@/lib/cities";
import { Button, Card, Field, FormError, Input, cx } from "@/components/ui";

type Sub = { id: number; name_he: string; budget_mandatory: boolean };
const radioCls = "flex cursor-pointer items-center justify-center rounded-xl border border-border px-3 py-3 text-sm font-semibold has-[:checked]:border-foreground has-[:checked]:bg-action";

export function RequestForm({ providerId, providerName, subs, jobs, defaultCity }: {
  providerId: string; providerName: string; subs: Sub[]; jobs: { id: string; title: string }[]; defaultCity: string;
}) {
  const [state, action, pending] = useActionState<RequestState, FormData>(sendRequest.bind(null, providerId), {});
  const [sub, setSub] = useState<number | "">(subs.length === 1 ? subs[0].id : "");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"onsite" | "remote" | "both" | "">("");
  const [budgetType, setBudgetType] = useState("");
  const chosen = subs.find((s) => s.id === sub);
  const budgetRequired = Boolean(chosen?.budget_mandatory) || mode === "remote" || mode === "both";
  const effectiveBudget = budgetRequired && budgetType === "open_to_quotes" ? "" : budgetType;

  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="budgetType" value={effectiveBudget} />
      <input type="hidden" name="mode" value={mode} />
      <Card className="flex flex-col gap-4">
        <Field label="תחום" htmlFor="sub">
          <select id="sub" name="sub" value={sub} onChange={(e) => setSub(Number(e.target.value) || "")} className="min-h-12 rounded-xl border border-border bg-surface px-3">
            <option value="">בחירה…</option>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.name_he}</option>)}
          </select>
        </Field>
        <Field label="כותרת" htmlFor="title"><Input id="title" name="title" maxLength={80} placeholder="במה צריך עזרה?" /></Field>
        <Field label="תיאור" htmlFor="description" hint={`${description.length}/1000 · לפחות 20 תווים`}>
          <textarea id="description" name="description" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)}
            className="min-h-32 rounded-xl border border-border bg-surface p-3" placeholder="מה צריך, באיזה היקף, ופרטים שחשוב לדעת…" />
        </Field>
        {jobs.length ? (
          <Field label="קישור לעבודה שפרסמת (לא חובה)" htmlFor="job">
            <select id="job" name="job" className="min-h-12 rounded-xl border border-border bg-surface px-3">
              <option value="">בלי</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </Field>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-bold">איפה?</h2>
        <fieldset className="grid grid-cols-3 gap-2">
          {(["onsite", "remote", "both"] as const).map((m) => (
            <label key={m} className={radioCls}>
              <input type="radio" name="modePick" className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
              {m === "onsite" ? "בשטח" : m === "remote" ? "מרחוק" : "שניהם"}
            </label>
          ))}
        </fieldset>
        {mode && mode !== "remote" ? (
          <Field label="עיר" htmlFor="city">
            <Input id="city" name="city" list="req-cities" defaultValue={defaultCity} />
            <datalist id="req-cities">{IL_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="font-bold">תקציב</h2>
        {budgetRequired ? <p className="text-sm text-muted">{mode === "remote" || mode === "both" ? "בעבודה מרחוק" : "בתחום הזה"} חובה לציין תקציב.</p> : null}
        <fieldset className="grid grid-cols-3 gap-2">
          {(["fixed", "hourly", "open_to_quotes"] as const).map((b) => (
            <label key={b} className={cx(radioCls, b === "open_to_quotes" && budgetRequired && "pointer-events-none opacity-40")}>
              <input type="radio" name="budgetPick" className="sr-only" checked={effectiveBudget === b} disabled={b === "open_to_quotes" && budgetRequired} onChange={() => setBudgetType(b)} />
              {b === "fixed" ? "מחיר לעבודה" : b === "hourly" ? "לשעה" : "הצעת מחיר"}
            </label>
          ))}
        </fieldset>
        {effectiveBudget && effectiveBudget !== "open_to_quotes" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="מ- (₪)" htmlFor="min"><Input id="min" name="min" inputMode="numeric" dir="ltr" className="text-left" /></Field>
            <Field label="עד (₪)" htmlFor="max" hint="לא חובה"><Input id="max" name="max" inputMode="numeric" dir="ltr" className="text-left" /></Field>
          </div>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-bold">מתי?</h2>
        <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["asap", "דחוף"], ["week", "תוך שבוע"], ["month", "תוך חודש"], ["flexible", "גמיש"]].map(([v, l]) => (
            <label key={v} className={radioCls}><input type="radio" name="timeline" value={v} className="sr-only" />{l}</label>
          ))}
        </fieldset>
      </Card>

      <p className="text-sm text-muted">הפנייה חינם עבורך. {providerName} יכול/ה לאשר או לדחות תוך 7 ימים. רק אם הפנייה מאושרת, ייחשפו הטלפון והמייל של שניכם.</p>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>{pending ? "שולחים…" : "שליחת הפנייה"}</Button>
    </form>
  );
}
