"use client";

import { submitWith } from "@/components/use-form-submit";
import { useActionState, useState, useTransition } from "react";
import { saveCategories, suggestCategory, type CatState } from "./actions";
import { Button, Card, Field, FormError, Input, cx } from "@/components/ui";

type Sub = { id: number; name_he: string; licensed: boolean; is_other: boolean };
type Cat = { id: number; name_he: string; subs: Sub[] };

export function CategoriesForm({ cats, initial }: { cats: Cat[]; initial: { subs: number[]; skills: string; license: string; otherTitle: string } }) {
  const [state, action, pending] = useActionState<CatState, FormData>(saveCategories, { values: initial });
  const v = state.values ?? initial;
  const [selected, setSelected] = useState<number[]>(v.subs);
  const all = cats.flatMap((c) => c.subs);
  const needsLicense = selected.some((id) => all.find((s) => s.id === id)?.licensed);
  const isOther = selected.some((id) => all.find((s) => s.id === id)?.is_other);

  const toggle = (id: number) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-5" noValidate>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold">בחרו את כל התחומים שבהם אתם עובדים</p>
          <span className="text-sm text-muted">נבחרו {selected.length}</span>
        </div>
        {cats.map((c) => {
          const count = c.subs.filter((s) => selected.includes(s.id)).length;
          return (
            <details key={c.id} open={count > 0} className="rounded-xl border border-border">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 font-semibold">
                {c.name_he}
                {count ? <span className="rounded-full bg-action px-2 text-xs text-foreground">{count}</span> : null}
              </summary>
              <div className="flex flex-wrap gap-2 px-4 pb-4">
                {c.subs.map((s) => {
                  const on = selected.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={cx(
                        "cursor-pointer rounded-full border px-3 py-1.5 text-sm",
                        on ? "border-foreground bg-action font-semibold" : "border-border",
                      )}
                    >
                      <input type="checkbox" name="sub" value={s.id} checked={on} onChange={() => toggle(s.id)} className="sr-only" />
                      {s.name_he}
                    </label>
                  );
                })}
              </div>
            </details>
          );
        })}
        <SuggestCategory />
      </Card>

      {needsLicense ? (
        <Field label="מספר רישיון" htmlFor="license" hint="יוצג בפרופיל עם הערה ש-Joby לא אימתה אותו.">
          <Input id="license" name="license" dir="ltr" className="text-left" defaultValue={v.license} />
        </Field>
      ) : null}
      {isOther ? (
        <Field label="מה אתם עושים?" htmlFor="otherTitle">
          <Input id="otherTitle" name="otherTitle" maxLength={60} defaultValue={v.otherTitle} />
        </Field>
      ) : null}
      <Field label="מיומנויות (לא חובה, עד 15, מופרדות בפסיק)" htmlFor="skills">
        <textarea id="skills" name="skills" defaultValue={v.skills} className="min-h-20 rounded-xl border border-border bg-surface p-3" placeholder="לוחות חשמל, תאורה, עמדות טעינה" />
      </Field>
      <FormError message={state.error} />
      <Button type="submit" disabled={pending || !selected.length}>{pending ? "שומרים…" : "המשך"}</Button>
    </form>
  );
}

function SuggestCategory() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  if (sent) return <p className="text-sm text-foreground">תודה! נבדוק ונוסיף. בינתיים אפשר לבחור &quot;אחר&quot;.</p>;
  if (!open) return <button type="button" className="self-start text-sm font-semibold text-foreground" onClick={() => setOpen(true)}>חסר המקצוע שלך? ספרו לנו</button>;
  return (
    <div className="flex gap-2">
      <Input aria-label="המקצוע החסר" value={text} onChange={(e) => setText(e.target.value)} placeholder="למשל: הדברה" />
      <Button type="button" variant="secondary" disabled={text.trim().length < 2 || pending} onClick={() => start(async () => setSent((await suggestCategory(text)).ok))}>
        שליחה
      </Button>
    </div>
  );
}
