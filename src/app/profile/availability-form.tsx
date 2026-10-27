"use client";

import { useActionState, useState } from "react";
import { submitWith } from "@/components/use-form-submit";
import { saveAvailability } from "./actions";
import { Button, FormError, Input, cx } from "@/components/ui";

const radio = "flex cursor-pointer items-center justify-center rounded-xl border border-border px-3 py-2.5 text-sm font-semibold has-[:checked]:border-accent has-[:checked]:bg-accent/15";

export function AvailabilityForm({ availability, busyUntil }: { availability: string; busyUntil: string | null }) {
  const [state, action, pending] = useActionState(saveAvailability, {});
  const [value, setValue] = useState(availability);
  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-3" noValidate>
      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">זמינות</legend>
        <label className={radio}><input type="radio" name="availability" value="available" className="sr-only" checked={value === "available"} onChange={() => setValue("available")} />● זמין/ה עכשיו</label>
        <label className={radio}><input type="radio" name="availability" value="busy" className="sr-only" checked={value === "busy"} onChange={() => setValue("busy")} />עסוק/ה כרגע</label>
      </fieldset>
      <div className={cx("flex items-center gap-2", value !== "busy" && "hidden")}>
        <label htmlFor="busyUntil" className="text-sm">עד (לא חובה)</label>
        <Input id="busyUntil" name="busyUntil" type="date" defaultValue={busyUntil ?? ""} className="max-w-48" />
      </div>
      <FormError message={state.error} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "שומרים…" : state.ok ? "נשמר ✓" : "שמירת הזמינות"}</Button>
    </form>
  );
}
