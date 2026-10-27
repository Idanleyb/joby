"use client";

import { submitWith } from "@/components/use-form-submit";
import { useActionState, useState, useTransition } from "react";
import { cancelSpouseInvite, inviteSpouse, type InviteState } from "./actions";
import { Button, Field, FormError, Input } from "@/components/ui";

export function SpouseInviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteSpouse, {});
  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-3" noValidate>
      <Field label="שם בן/בת הזוג" htmlFor="sp-name"><Input id="sp-name" name="name" /></Field>
      <Field label="טלפון נייד" htmlFor="sp-phone"><Input id="sp-phone" name="phone" type="tel" dir="ltr" className="text-left" placeholder="050-123-4567" /></Field>
      <FormError message={state.error} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "יוצרים הזמנה…" : "יצירת הזמנה"}</Button>
    </form>
  );
}

export function SpouseInviteShare({ linkId, url, phone, name, reservist }: { linkId: string; url: string; phone: string; name: string; reservist: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const text = `היי ${name}, הזמנתי אותך ל-Joby — המרקטפלייס של המילואים. כבן/בת זוג של מילואימניק אפשר להציע שם שירותים: ${url}\n— ${reservist}`;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">ההזמנה ל{name} מוכנה. שלחו לה/לו את הקישור:</p>
      <p dir="ltr" className="break-all rounded-xl bg-background px-3 py-2 text-left text-xs">{url}</p>
      <div className="grid grid-cols-2 gap-2">
        <a href={`https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
           className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#25D366] px-4 font-semibold text-white">
          שליחה ב-WhatsApp
        </a>
        <Button type="button" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(url); setCopied(true); }}>
          {copied ? "הועתק ✓" : "העתקת קישור"}
        </Button>
      </div>
      <Button type="button" variant="ghost" disabled={pending} onClick={() => start(() => cancelSpouseInvite(linkId))}>ביטול ההזמנה</Button>
    </div>
  );
}
