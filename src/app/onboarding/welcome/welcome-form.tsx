"use client";

import { submitWith } from "@/components/use-form-submit";
import Link from "next/link";
import { useActionState } from "react";
import { completeSignup, type WelcomeState } from "./actions";
import { Button, Field, FormError, Input, cx } from "@/components/ui";

function RoleOption({ name, title, text, checked }: { name: string; title: string; text: string; checked?: boolean }) {
  return (
    <label
      className={cx(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4",
        "has-[:checked]:border-foreground has-[:checked]:bg-action",
      )}
    >
      <input type="checkbox" name={name} defaultChecked={checked} className="mt-1 size-5 accent-[var(--brand)]" />
      <span className="flex flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted">{text}</span>
      </span>
    </label>
  );
}

export function WelcomeForm({ defaultFirst, defaultLast, next, invited, returning }: {
  defaultFirst: string; defaultLast: string; next: string | null; invited?: "spouse" | "admin"; returning?: boolean;
}) {
  const [state, action, pending] = useActionState<WelcomeState, FormData>(completeSignup, {});
  const fe = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-6" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {invited === "spouse" ? <p className="rounded-xl bg-info px-4 py-3 text-sm">הוזמנת כבן/בת זוג של מילואימניק. בחר/י ״להציע שירותים״ כדי להמשיך להזמנה.</p> : null}
      {invited === "admin" ? <p className="rounded-xl bg-info px-4 py-3 text-sm">הוזמנת לנהל את Joby. בחירת תפקיד כאן לא חובה — אפשר להמשיך ישר לאישור ההזמנה.</p> : null}
      {returning ? <input type="hidden" name="returning" value="1" /> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="שם פרטי" htmlFor="firstName" error={fe.firstName}>
          <Input id="firstName" name="firstName" autoComplete="given-name" defaultValue={v?.firstName ?? defaultFirst} required />
        </Field>
        <Field label="שם משפחה" htmlFor="lastName" error={fe.lastName}>
          <Input id="lastName" name="lastName" autoComplete="family-name" defaultValue={v?.lastName ?? defaultLast} required />
        </Field>
      </div>
      <p className="-mt-4 text-xs text-muted">השם המלא נשאר פרטי. בפרופיל מוצג שם פרטי ואות ראשונה משם המשפחה.</p>

      {returning ? null : (
        <>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1.5 text-sm font-semibold">מה תרצו לעשות ב-Joby?</legend>
            <RoleOption name="asProvider" checked={v?.asProvider} title="להציע שירותים" text="למילואימניקים עם 30 ימי מילואים ומעלה מאז 7 באוקטובר, ולבני ובנות זוג." />
            <RoleOption name="asPoster" checked={v?.asPoster} title="לפרסם עבודות ולגייס" text="פתוח לכולם — פרטיים, עסקים, מגייסים וגופים ציבוריים." />
            <p className="text-xs text-muted">אפשר לבחור את שתי האפשרויות, ולהוסיף תפקיד גם בהמשך.{invited === "admin" ? " (לא חובה למוזמנים לניהול.)" : ""}</p>
            {fe.roles ? <p role="alert" className="text-sm font-medium text-danger">{fe.roles}</p> : null}
          </fieldset>

          <div className="flex flex-col gap-3 text-sm">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="terms" defaultChecked={v?.terms} className="mt-0.5 size-5 accent-[var(--brand)]" />
              <span>
                קראתי ואני מאשר/ת את <Link prefetch={false} href="/terms" target="_blank" className="underline">תנאי השימוש</Link> ואת{" "}
                <Link prefetch={false} href="/privacy" target="_blank" className="underline">מדיניות הפרטיות</Link>.
              </span>
            </label>
            {fe.terms ? <p role="alert" className="font-medium text-danger">{fe.terms}</p> : null}
            <label className="flex items-start gap-3 text-muted">
              <input type="checkbox" name="marketing" defaultChecked={v?.marketing} className="mt-0.5 size-5 accent-[var(--brand)]" />
              <span>אשמח לקבל עדכונים ומבצעים ב-WhatsApp ובמייל (לא חובה).</span>
            </label>
          </div>
        </>
      )}
      <FormError message={state.error} />
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "המשך"}</Button>
    </form>
  );
}
