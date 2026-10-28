"use client";

import { useActionState, useState } from "react";
import { submitWith } from "@/components/use-form-submit";
import { submitFeedback, type FeedbackState } from "../actions";
import { Button, FormError, cx } from "@/components/ui";

function Stars({ name, label, required }: { name: string; label: string; required?: boolean }) {
  const [value, setValue] = useState(0);
  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-2">
      <legend className="sr-only">{label}</legend>
      <span aria-hidden="true" className="text-sm font-semibold">{label}{required ? " *" : ""}</span>
      <div className="flex flex-row-reverse justify-end gap-1" dir="ltr">
        {[5, 4, 3, 2, 1].map((n) => (
          <label key={n} className="cursor-pointer">
            <input type="radio" name={name} value={n} className="peer sr-only" checked={value === n} onChange={() => setValue(n)} aria-label={`${label}: ${n} מתוך 5`} />
            <span className={cx("text-3xl leading-none", n <= value ? "text-foreground" : "text-border")}>★</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const radio = "flex cursor-pointer items-center justify-center rounded-xl border border-border px-3 py-3 text-sm font-semibold has-[:checked]:border-foreground has-[:checked]:bg-action";
const NO_REASONS = [["no_response", "הצד השני לא הגיב"], ["price", "מחיר"], ["availability", "זמינות"], ["not_a_fit", "לא התאים"], ["other", "אחר"]];

export function FeedbackForm({ engagementId, iAmPoster, otherName, allowNotYet }: { engagementId: string; iAmPoster: boolean; otherName: string; allowNotYet: boolean }) {
  const [state, action, pending] = useActionState<FeedbackState, FormData>(submitFeedback.bind(null, engagementId), {});
  const [worked, setWorked] = useState("");
  const [comment, setComment] = useState("");
  const scores = iAmPoster
    ? [["quality", "איכות העבודה"], ["communication", "תקשורת"], ["reliability", "אמינות ועמידה בזמנים"], ["value_for_money", "תמורה למחיר"]]
    : [["brief_clarity", "בהירות הדרישות"], ["communication", "תקשורת"], ["fair_payment", "תשלום ותנאים הוגנים"]];

  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-5" noValidate>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-bold">עבדתם יחד עם <bdi>{otherName}</bdi>?</legend>
        <div className={cx("grid gap-2", allowNotYet ? "grid-cols-3" : "grid-cols-2")}>
          <label className={radio}><input type="radio" name="worked" value="yes" className="sr-only" onChange={() => setWorked("yes")} />כן</label>
          {allowNotYet ? <label className={radio}><input type="radio" name="worked" value="not_yet" className="sr-only" onChange={() => setWorked("not_yet")} />עוד לא</label> : null}
          <label className={radio}><input type="radio" name="worked" value="no" className="sr-only" onChange={() => setWorked("no")} />לא</label>
        </div>
      </fieldset>

      {worked === "yes" ? (
        <div className="flex flex-col gap-4">
          <Stars name="overall" label="דירוג כללי" required />
          <div className="flex flex-col gap-3 rounded-2xl bg-background p-4">
            {scores.map(([k, l]) => <Stars key={k} name={k} label={l} />)}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">{iAmPoster ? "היית מעסיק/ה שוב?" : "היית עובד/ת איתם שוב?"}</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={radio}><input type="radio" name="again" value="yes" className="sr-only" />כן</label>
              <label className={radio}><input type="radio" name="again" value="no" className="sr-only" />לא</label>
            </div>
          </fieldset>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">תגובה פומבית (לא חובה)
            <textarea name="comment" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-24 rounded-xl border border-border bg-surface p-3 font-normal" />
            <span className="text-xs font-normal text-muted">{comment.length}/500 · תופיע בפרופיל, בלי שמך המלא</span>
          </label>
        </div>
      ) : null}

      {worked === "no" ? (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">מה קרה?
          <select name="noReason" defaultValue="" className="min-h-12 rounded-xl border border-border bg-surface px-3 font-normal">
            <option value="" disabled>בחירה…</option>
            {NO_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <span className="text-xs font-normal text-muted">לא מוצג לאף אחד ולא משפיע על הדירוג.</span>
        </label>
      ) : null}

      {worked === "yes" || worked === "no" ? (
        <label className="flex flex-col gap-1.5 text-sm font-semibold">הערה פרטית לצוות Joby (לא חובה)
          <textarea name="note" maxLength={1000} className="min-h-20 rounded-xl border border-border bg-surface p-3 font-normal" />
        </label>
      ) : null}
      {worked === "not_yet" ? <p className="text-sm text-muted">בסדר. נשאל שוב בתזכורת הבאה.</p> : null}

      <FormError message={state.error} />
      <Button type="submit" disabled={!worked || pending}>{pending ? "שולחים…" : worked === "not_yet" ? "עדכון" : "שליחת המשוב"}</Button>
      {worked === "yes" ? <p className="text-xs text-muted">המשוב לא ניתן לעריכה אחרי השליחה. שתי חוות הדעת מתפרסמות יחד כששני הצדדים שלחו, או 14 ימים אחרי הראשונה.</p> : null}
    </form>
  );
}
