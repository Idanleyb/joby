"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { confirmEmailCode, sendEmailCode } from "./actions";
import { Button, Field, FormError, Input } from "@/components/ui";

const RESEND_SECONDS = 30;

/** Email + 6-digit code sent by email (founder, 2026-10-29). */
export function EmailCodeForm({ defaultEmail, next }: { defaultEmail: string; next: string }) {
  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pending, start] = useTransition();
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);
  useEffect(() => {
    if (stage === "code") codeInput.current?.focus();
  }, [stage]);

  const send = () =>
    start(async () => {
      setError(null);
      const r = await sendEmailCode(email);
      if (r.error) return setError(r.error);
      setEmail(r.email ?? email);
      setCode("");
      setStage("code");
      setSecondsLeft(RESEND_SECONDS);
    });

  if (stage === "email") {
    return (
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex flex-col gap-4" noValidate>
        <Field label="כתובת מייל" htmlFor="email" hint="נשלח אליך קוד בן 6 ספרות">
          <Input id="email" name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" className="text-left"
            placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <FormError message={error} />
        <Button type="submit" disabled={pending}>{pending ? "שולחים…" : "שלחו לי קוד"}</Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const r = await confirmEmailCode(code);
          if (r.error) return setError(r.error);
          window.location.assign(next);
        });
      }}
      className="flex flex-col gap-4"
      noValidate
    >
      <p className="text-sm">שלחנו קוד אל <bdi dir="ltr" className="font-semibold">{email}</bdi>. לא הגיע? בדקו גם בתיקיית הספאם.</p>
      <Field label="קוד מהמייל" htmlFor="email-code">
        <Input id="email-code" ref={codeInput} name="code" inputMode="numeric" autoComplete="one-time-code" dir="ltr"
          className="text-center text-xl tracking-[0.4em]" maxLength={6} value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required />
      </Field>
      <FormError message={error} />
      <Button type="submit" disabled={pending}>{pending ? "בודקים…" : "אישור"}</Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button type="button" className="underline underline-offset-4 disabled:no-underline disabled:opacity-60"
          disabled={secondsLeft > 0 || pending} onClick={send}>
          {secondsLeft > 0 ? `שליחה חוזרת בעוד ${secondsLeft} שניות` : "שליחת קוד חדש"}
        </button>
        <button type="button" className="underline underline-offset-4" onClick={() => { setStage("email"); setError(null); }}>
          שינוי כתובת
        </button>
      </div>
    </form>
  );
}
