"use client";

import { useActionState } from "react";
import { submitWith } from "@/components/use-form-submit";
import { saveContactPhone, type ContactPhoneState } from "./actions";
import { Button, Field, FormError, Input } from "@/components/ui";

export function ContactPhoneForm({ next }: { next: string | null }) {
  const [state, action, pending] = useActionState<ContactPhoneState, FormData>(saveContactPhone, {});
  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="מספר טלפון נייד" htmlFor="phone" hint="בלי קוד אימות — נכנסת עם Google.">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className="text-left"
          placeholder="050-1234567" defaultValue={state.phone} />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "המשך"}</Button>
    </form>
  );
}
