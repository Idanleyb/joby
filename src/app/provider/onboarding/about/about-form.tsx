"use client";

import { submitWith } from "@/components/use-form-submit";
import { useActionState } from "react";
import { saveAbout, type AboutState, type AboutValues } from "./actions";
import { Button, Card, Field, FormError, Input } from "@/components/ui";

const LANGS = ["עברית", "אנגלית", "ערבית", "רוסית", "אמהרית", "צרפתית", "ספרדית"];

export function AboutForm({ initial }: { initial: AboutValues }) {
  const [state, action, pending] = useActionState<AboutState, FormData>(saveAbout, { values: initial });
  const v = state.values ?? initial;
  const fe = state.fieldErrors ?? {};
  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-5" noValidate>
      <Card className="flex flex-col gap-5">
        <Field label="כותרת" htmlFor="headline" error={fe.headline} hint="מה אתם עושים, במשפט אחד. למשל: ״חשמלאי מוסמך, בתים ועסקים״">
          <Input id="headline" name="headline" maxLength={70} defaultValue={v.headline} />
        </Field>
        <Field label="על עצמי" htmlFor="bio" error={fe.bio} hint="ניסיון, סוגי עבודות, למה לבחור בכם.">
          <textarea id="bio" name="bio" maxLength={1000} defaultValue={v.bio} className="min-h-36 rounded-xl border border-border bg-surface p-3" />
        </Field>
        <Field label="שנות ניסיון" htmlFor="years" error={fe.years}>
          <Input id="years" name="years" inputMode="numeric" maxLength={2} defaultValue={v.years} className="max-w-28" />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">שפות (לא חובה)</legend>
          <div className="flex flex-wrap gap-2">
            {[...new Set([...LANGS, ...v.languages])].map((l) => (
              <label key={l} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/15">
                <input type="checkbox" name="languages" value={l} defaultChecked={v.languages.includes(l)} className="sr-only" />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="קישורים לעבודות (לא חובה, עד 5)" htmlFor="portfolio" error={fe.portfolio} hint="אתר, תיק עבודות, אינסטגרם — כל קישור בשורה נפרדת.">
          <textarea id="portfolio" name="portfolio" dir="ltr" defaultValue={v.portfolio} className="min-h-20 rounded-xl border border-border bg-surface p-3 text-left" />
        </Field>
      </Card>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "המשך"}</Button>
    </form>
  );
}
