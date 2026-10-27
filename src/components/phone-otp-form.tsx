"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizeIlPhone, formatIlPhone } from "@/lib/phone";
import { authErrorMessage } from "@/lib/errors";
import { Button, Field, FormError, Input } from "@/components/ui";

const RESEND_SECONDS = 30; // PRD 5.1

/**
 * Phone + 6-digit code.
 *  mode "signin": sign in or sign up with a phone number (PRD 5.1).
 *  mode "add":    a signed-in user without a verified phone (Google sign-up) adds one.
 */
export function PhoneOtpForm({ mode, next = "/onboarding" }: { mode: "signin" | "add"; next?: string }) {
  const supabase = useRef(createClient()).current;
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [rawPhone, setRawPhone] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (stage === "code") codeInput.current?.focus();
  }, [stage]);

  // The technical code is shown in small print so support can diagnose (e.g. Twilio setup).
  function showError(err: { code?: string; message?: string; status?: number }) {
    setError(authErrorMessage(err));
    setErrorCode([err.code, err.status, err.message].filter(Boolean).join(" · ").slice(0, 200));
  }

  async function sendCode(target: string) {
    setBusy(true);
    setError(null);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithOtp({ phone: target, options: { shouldCreateUser: true } })
        : await supabase.auth.updateUser({ phone: target });
    setBusy(false);
    if (error) {
      showError(error);
      return false;
    }
    setSecondsLeft(RESEND_SECONDS);
    return true;
  }

  async function onSubmitPhone(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeIlPhone(rawPhone);
    if (!normalized) {
      setError("יש להזין מספר נייד ישראלי, למשל 050-123-4567.");
      setErrorCode(null);
      return;
    }
    setPhone(normalized);
    if (await sendCode(normalized)) {
      setCode("");
      setStage("code");
    }
  }

  async function onSubmitCode(e: React.FormEvent) {
    e.preventDefault();
    if (!phone) return;
    if (!/^\d{6}$/.test(code)) {
      setError("הקוד כולל 6 ספרות.");
      setErrorCode(null);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: mode === "signin" ? "sms" : "phone_change",
    });
    if (error) {
      setBusy(false);
      showError(error);
      return;
    }
    // Full page load so the header and menu (rendered in the layout) pick up the new session.
    window.location.assign(next);
  }

  if (stage === "phone") {
    return (
      <form onSubmit={onSubmitPhone} className="flex flex-col gap-4" noValidate>
        <Field label="מספר טלפון נייד" htmlFor="phone" hint="נשלח אליך קוד חד-פעמי ב-SMS">
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="050-123-4567"
            value={rawPhone}
            onChange={(e) => setRawPhone(e.target.value)}
            className="text-left"
            required
          />
        </Field>
        <FormError message={error} />
        {error && errorCode ? <p dir="ltr" className="-mt-2 text-left text-xs text-muted">{errorCode}</p> : null}
        <Button type="submit" disabled={busy}>
          {busy ? "שולחים…" : "שלחו לי קוד"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmitCode} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted">
        שלחנו קוד בן 6 ספרות למספר{" "}
        <span dir="ltr" className="font-semibold text-foreground">
          {formatIlPhone(phone)}
        </span>
      </p>
      <Field label="קוד אימות" htmlFor="code">
        <Input
          ref={codeInput}
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="text-center text-2xl tracking-[0.5em]"
        />
      </Field>
      <FormError message={error} />
      {error && errorCode ? <p dir="ltr" className="-mt-2 text-left text-xs text-muted">{errorCode}</p> : null}
      <Button type="submit" disabled={busy || code.length !== 6}>
        {busy ? "מאמתים…" : "אישור"}
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          className="text-muted underline-offset-4 hover:underline"
          onClick={() => {
            setStage("phone");
            setError(null);
          }}
        >
          שינוי מספר
        </button>
        <button
          type="button"
          className="font-semibold text-accent-strong disabled:font-normal disabled:text-muted"
          disabled={secondsLeft > 0 || busy}
          onClick={() => phone && sendCode(phone)}
        >
          {secondsLeft > 0 ? `שליחה חוזרת בעוד ${secondsLeft} שנ׳` : "שליחת קוד חדש"}
        </button>
      </div>
    </form>
  );
}
