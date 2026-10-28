"use client";

import { submitWith } from "@/components/use-form-submit";
import { useActionState, useState } from "react";
import { saveArea, type AreaState } from "./actions";
import { IL_CITIES } from "@/lib/cities";
import { Button, Card, Field, FormError, Input } from "@/components/ui";

export function AreaForm({ initial }: { initial: NonNullable<AreaState["values"]> }) {
  const [state, action, pending] = useActionState<AreaState, FormData>(saveArea, { values: initial });
  const v = state.values ?? initial;
  const [onsite, setOnsite] = useState(v.onsite);
  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-5" noValidate>
      <Card className="flex flex-col gap-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="onsite" checked={onsite} onChange={(e) => setOnsite(e.target.checked)} className="mt-1 size-5 accent-[var(--brand)]" />
          <span><span className="font-semibold">עבודה בשטח</span><br /><span className="text-sm text-muted">מגיע/ה ללקוח — בית, משרד, אתר</span></span>
        </label>
        {onsite ? (
          <div className="grid gap-4 ps-8 sm:grid-cols-2">
            <Field label="עיר" htmlFor="city">
              <Input id="city" name="city" list="il-cities" defaultValue={v.city} />
              <datalist id="il-cities">{IL_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="מרחק עבודה" htmlFor="radius">
              <select id="radius" name="radius" defaultValue={v.radius} className="min-h-12 rounded-xl border border-border bg-surface px-3">
                <option value="10">עד 10 ק״מ</option>
                <option value="25">עד 25 ק״מ</option>
                <option value="50">עד 50 ק״מ</option>
                <option value="nationwide">כל הארץ</option>
              </select>
            </Field>
          </div>
        ) : null}
        <label className="flex items-start gap-3">
          <input type="checkbox" name="remote" defaultChecked={v.remote} className="mt-1 size-5 accent-[var(--brand)]" />
          <span><span className="font-semibold">עבודה מרחוק</span><br /><span className="text-sm text-muted">אפשר לעבוד איתי מכל מקום</span></span>
        </label>
      </Card>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "המשך"}</Button>
    </form>
  );
}
