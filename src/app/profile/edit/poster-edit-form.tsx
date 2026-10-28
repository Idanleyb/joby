"use client";

import { useActionState, useState } from "react";
import { submitWith } from "@/components/use-form-submit";
import { savePosterDetails, type PosterEditState } from "../actions";
import { FileUpload } from "@/components/file-upload";
import { IL_CITIES } from "@/lib/cities";
import { Button, Field, FormError, Input } from "@/components/ui";

export function PosterEditForm({ userId, p }: { userId: string; p: { poster_type: string; company_name: string | null; city: string; website: string | null; about: string | null } }) {
  const [state, action, pending] = useActionState<PosterEditState, FormData>(savePosterDetails, {});
  const [logo, setLogo] = useState("");
  const [about, setAbout] = useState(p.about ?? "");
  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-4" noValidate>
      {p.poster_type !== "private" ? (
        <Field label="שם הארגון" htmlFor="companyName"><Input id="companyName" name="companyName" defaultValue={p.company_name ?? ""} /></Field>
      ) : null}
      <Field label="עיר" htmlFor="city">
        <Input id="city" name="city" list="il-cities" defaultValue={p.city} />
        <datalist id="il-cities">{IL_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
      </Field>
      <Field label="קצת עלינו (לא חובה)" htmlFor="about" hint={`${about.length}/500`}>
        <textarea id="about" name="about" maxLength={500} value={about} onChange={(e) => setAbout(e.target.value)}
          className="min-h-28 rounded-xl border border-border bg-surface p-3" placeholder="מי אתם ואיזה עבודות אתם מפרסמים בדרך כלל" />
      </Field>
      <Field label="אתר (לא חובה)" htmlFor="website"><Input id="website" name="website" dir="ltr" className="text-left" defaultValue={p.website ?? ""} /></Field>
      <input type="hidden" name="logo" value={logo} />
      <FileUpload bucket="avatars" userId={userId} folder="logo" accept={["image/jpeg", "image/png", "image/webp"]} maxFiles={1} maxMb={2}
        label={p.poster_type === "private" ? "תמונה (לא חובה)" : "לוגו (לא חובה)"} onChange={(f) => setLogo(f[0]?.path ?? "")} />
      <FormError message={state.error} />
      {state.ok ? <p role="status" className="rounded-xl bg-info px-4 py-3 text-sm">נשמר ✓</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "שמירה"}</Button>
    </form>
  );
}
