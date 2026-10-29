"use client";

import { useState, useTransition } from "react";
import { signInAsDemo } from "@/app/login/demo-actions";
import type { DemoAccount } from "@/lib/demo-login";
import { DemoBadge } from "@/components/ui";

/** "Try a demo account": one click, no SMS. Shown only while demo data is loaded. */
export function DemoLogin({ accounts, next = "/home" }: { accounts: DemoAccount[]; next?: string }) {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!accounts.length) return null;
  return (
    <section aria-labelledby="demo-login-h" className="flex flex-col gap-3 rounded-2xl border border-dashed border-foreground/40 bg-surface p-5">
      <div className="flex items-center gap-2">
        <DemoBadge />
        <h2 id="demo-login-h" className="font-bold">נסו חשבון דמו</h2>
      </div>
      <p className="text-sm text-muted">כניסה בלחיצה, בלי SMS, לחשבונות לדוגמה עם עבודות, מועמדויות, פניות ומשובים. חשבונות הדמו נפרדים לגמרי ממשתמשים אמיתיים.</p>
      <div className="grid gap-2">
        {accounts.map((a) => (
          <button key={a.key} type="button" disabled={pending}
            onClick={() => start(async () => {
              setBusy(a.key);
              setError(null);
              const r = await signInAsDemo(a.key);
              if (r.error) { setError(r.error); setBusy(null); return; }
              // Full page load so the header and menu pick up the new session.
              window.location.assign(next);
            })}
            className="flex flex-col items-start rounded-xl border border-border px-4 py-3 text-start hover:border-foreground disabled:opacity-60">
            <span className="font-semibold"><bdi>{a.name}</bdi> · {a.role}{busy === a.key ? " · נכנסים…" : ""}</span>
            <span className="text-xs text-muted">{a.sees}</span>
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
    </section>
  );
}
