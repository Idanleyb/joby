"use client";

import { useActionState, useState } from "react";
import { inviteAdmin, type InviteState } from "./actions";
import { Banner, Button, Field, FormError, Input } from "@/components/ui";

export function InviteAdminForm({ defaultMessage, mailReady }: { defaultMessage: string; mailReady: boolean }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteAdmin, {});
  const [copied, setCopied] = useState(false);
  const v = state.values;

  return (
    <div className="flex flex-col gap-4">
      {state.sent ? (
        <Banner tone={state.sent.emailed ? "info" : "action"} className="flex flex-col gap-2">
          <p className="font-semibold">
            {state.sent.emailed
              ? `ההזמנה נשלחה למייל ${state.sent.email}.`
              : `ההזמנה ל-${state.sent.name} נוצרה, אבל המייל לא נשלח${mailReady ? " (שגיאה בשליחה)" : " (שליחת מיילים עדיין לא מוגדרת)"}. העתיקו את הקישור ושלחו בעצמכם:`}
          </p>
          {state.sent.existingUser ? <p>יש כבר חשבון עם המייל הזה, אז קיבל/ה גם התראה באפליקציה.</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <code dir="ltr" data-testid="invite-link" className="min-w-0 flex-1 break-all rounded-lg bg-surface px-2 py-1 text-xs">{state.sent.link}</code>
            <Button type="button" variant="secondary" className="min-h-9 px-3 text-sm"
              onClick={() => navigator.clipboard?.writeText(state.sent!.link).then(() => setCopied(true), () => {})}>
              {copied ? "הועתק" : "העתקת הקישור"}
            </Button>
          </div>
        </Banner>
      ) : null}

      <form action={action} className="flex flex-col gap-4" key={state.sent?.link ?? "new"}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="שם" htmlFor="invite-name">
            <Input id="invite-name" name="name" required defaultValue={v?.name} autoComplete="off" />
          </Field>
          <Field label="מייל" htmlFor="invite-email">
            <Input id="invite-email" name="email" type="email" dir="ltr" className="text-left" required defaultValue={v?.email} autoComplete="off" />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-semibold">הרשאה</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="role" value="admin" defaultChecked={v?.role !== "reviewer"} className="mt-1" />
            <span><b>אדמין</b> — הכול, כולל הוספת אדמינים ונתוני דמו</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" name="role" value="reviewer" defaultChecked={v?.role === "reviewer"} className="mt-1" />
            <span><b>בודק/ת</b> — תורי אימות ובדיקת עבודות בלבד</span>
          </label>
        </fieldset>
        <Field label="נוסח המייל" htmlFor="invite-message" hint="[שם] מוחלף בשם. הקישור לאישור מתווסף אוטומטית מתחת לטקסט.">
          <textarea id="invite-message" name="message" rows={3} defaultValue={v?.message ?? defaultMessage}
            className="w-full rounded-xl border border-input-border bg-surface px-4 py-3 text-base focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground" />
        </Field>
        <FormError message={state.error} />
        <Button type="submit" disabled={pending}>{pending ? "שולחים…" : "שליחת הזמנה"}</Button>
      </form>
    </div>
  );
}
