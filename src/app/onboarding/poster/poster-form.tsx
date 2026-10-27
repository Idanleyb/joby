"use client";

import { submitWith } from "@/components/use-form-submit";
import { useActionState, useState } from "react";
import { savePosterProfile, type PosterState } from "./actions";
import { IL_CITIES } from "@/lib/cities";
import { Button, Field, FormError, Input, cx } from "@/components/ui";

const TYPES = [
  { value: "private", label: "אדם פרטי", text: "צריך בעל מקצוע לבית או לפרויקט אישי" },
  { value: "business", label: "עסק", text: "חברה, עסק קטן או עצמאי/ת" },
  { value: "hr", label: "מגייס/ת או משאבי אנוש", text: "מגייסים עבור חברה" },
  { value: "public_body", label: "גוף ציבורי או עמותה", text: "רשות, מוסד, עמותה" },
] as const;

export function PosterForm() {
  const [state, action, pending] = useActionState<PosterState, FormData>(savePosterProfile, {});
  const [type, setType] = useState<string>("");
  const fe = state.fieldErrors ?? {};
  const v = state.values;
  const isOrg = type !== "" && type !== "private";

  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">מי מפרסם?</legend>
        {TYPES.map((t) => (
          <label
            key={t.value}
            className={cx(
              "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3.5",
              "has-[:checked]:border-accent has-[:checked]:ring-2 has-[:checked]:ring-accent/30",
            )}
          >
            <input
              type="radio"
              name="posterType"
              value={t.value}
              defaultChecked={v?.posterType === t.value}
              onChange={() => setType(t.value)}
              className="mt-1 size-5 accent-[var(--accent-strong)]"
            />
            <span className="flex flex-col">
              <span className="font-semibold">{t.label}</span>
              <span className="text-sm text-muted">{t.text}</span>
            </span>
          </label>
        ))}
        {fe.posterType ? <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{fe.posterType}</p> : null}
      </fieldset>

      {isOrg ? (
        <>
          <Field label="שם הארגון" htmlFor="companyName" error={fe.companyName} hint="יוצג על העבודות שתפרסמו.">
            <Input id="companyName" name="companyName" autoComplete="organization" defaultValue={v?.companyName} />
          </Field>
          <Field label="אתר (לא חובה)" htmlFor="website" error={fe.website}>
            <Input id="website" name="website" type="url" inputMode="url" dir="ltr" placeholder="example.co.il" className="text-left" defaultValue={v?.website} />
          </Field>
        </>
      ) : null}

      <Field label="עיר" htmlFor="city" error={fe.city}>
        <Input id="city" name="city" list="il-cities" autoComplete="address-level2" defaultValue={v?.city} />
        <datalist id="il-cities">
          {IL_CITIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "סיום"}</Button>
    </form>
  );
}
