"use client";

import { useActionState, useState, useTransition } from "react";
import { adjustCredits, setStatus, signInAsUser, updateUser, type EditState } from "../actions";
import { Button, Field, FormError, Input } from "@/components/ui";

type U = { id: string; firstName: string; lastName: string; email: string; phone: string; city: string; isPoster: boolean };

export function EditUserForm({ u }: { u: U }) {
  const [state, action, pending] = useActionState<EditState, FormData>(updateUser.bind(null, u.id), {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="current_phone" value={u.phone} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="שם פרטי" htmlFor="first_name"><Input id="first_name" name="first_name" defaultValue={u.firstName} required /></Field>
        <Field label="שם משפחה" htmlFor="last_name"><Input id="last_name" name="last_name" defaultValue={u.lastName} required /></Field>
        <Field label="מייל" htmlFor="email" hint="נשמר כמאומת"><Input id="email" name="email" type="email" dir="ltr" className="text-left" defaultValue={u.email} /></Field>
        <Field label="טלפון נייד" htmlFor="phone" hint="מספר הכניסה ב-SMS"><Input id="phone" name="phone" type="tel" dir="ltr" className="text-left" defaultValue={u.phone} /></Field>
        <Field label="עיר" htmlFor="city" hint="בפרופיל נותן השירות ובפרופיל המגייס"><Input id="city" name="city" defaultValue={u.city} /></Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" name="is_poster" defaultChecked={u.isPoster} className="size-5" /> מגייס/ת (יכול/ה לפרסם עבודות)</label>
      </div>
      <Field label="סיבת השינוי (חובה, נשמרת ביומן)" htmlFor="reason"><Input id="reason" name="reason" required /></Field>
      <FormError message={state.error} />
      {state.ok ? <p role="status" className="rounded-xl bg-gain px-4 py-3 text-sm font-medium">נשמר ✓</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "שמירת הפרטים"}</Button>
    </form>
  );
}

function ReasonAction({ label, confirmLabel, run, extra, danger }: {
  label: string; confirmLabel: string; danger?: boolean;
  run: (reason: string, extra: string) => Promise<{ error?: string }>; extra?: { label: string; placeholder: string };
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  if (!open) return <Button type="button" variant={danger ? "action" : "secondary"} onClick={() => setOpen(true)}>{label}</Button>;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-action-border bg-action p-3">
      {extra ? <Input aria-label={extra.label} placeholder={extra.placeholder} value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" className="text-left" /> : null}
      <Input aria-label="סיבה" placeholder="סיבה (חובה, נשמרת ביומן)" value={reason} onChange={(e) => setReason(e.target.value)} />
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" disabled={pending || reason.trim().length < 5} onClick={() => start(async () => {
          setError(undefined);
          const r = await run(reason.trim(), value.trim());
          if (r?.error) setError(r.error); else { setOpen(false); setReason(""); setValue(""); }
        })}>{pending ? "רגע…" : confirmLabel}</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>ביטול</Button>
      </div>
    </div>
  );
}

export function StatusAction({ userId, suspended }: { userId: string; suspended: boolean }) {
  return <ReasonAction label={suspended ? "החזרת החשבון לפעילות" : "השעיית החשבון"} confirmLabel={suspended ? "החזרה לפעילות" : "השעיה"} danger={!suspended}
    run={(reason) => setStatus(userId, suspended ? "active" : "suspended", reason)} />;
}

export function CreditsAction({ userId }: { userId: string }) {
  return <ReasonAction label="הוספה או הורדה של קרדיטים" confirmLabel="עדכון קרדיטים" extra={{ label: "כמות", placeholder: "למשל 50 או ‎-10" }}
    run={(reason, amount) => adjustCredits(userId, Number(amount), reason)} />;
}

export function SignInAsAction({ userId, name, next = "/home" }: { userId: string; name: string; next?: string }) {
  return <ReasonAction label={`כניסה לחשבון של ${name}`} confirmLabel="כניסה לחשבון (30 דקות)" danger
    run={async (reason) => {
      const r = await signInAsUser(userId, reason);
      // Full page load: the whole app now runs as the user, with the red banner.
      if (!r.error) window.location.assign(next);
      return r;
    }} />;
}
