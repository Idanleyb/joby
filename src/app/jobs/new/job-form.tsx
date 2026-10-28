"use client";

import { useActionState, useMemo, useState } from "react";
import { submitWith } from "@/components/use-form-submit";
import { publishJob, type PostState } from "./actions";
import { FileUpload } from "@/components/file-upload";
import { JobDetails } from "@/components/job-view";
import { IL_CITIES } from "@/lib/cities";
import { Button, Card, Field, FormError, Input, cx } from "@/components/ui";

type Cat = { id: number; name_he: string; budget_mandatory: boolean; subs: { id: number; name_he: string }[] };
const ATTACH_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const radioCls = "flex cursor-pointer items-center justify-center rounded-xl border border-border px-3 py-3 text-sm font-semibold has-[:checked]:border-foreground has-[:checked]:bg-action";

export function JobForm({ cats, userId, poster }: { cats: Cat[]; userId: string; poster: { display_name: string; poster_type: string; jobs_posted: number; jobs_closed: number; hires: number; rating_avg: number | null; rating_count: number } }) {
  const [state, action, pending] = useActionState<PostState, FormData>(publishJob, {});
  const [catId, setCatId] = useState<number | "">("");
  const [sub, setSub] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState("");
  const [mode, setMode] = useState<"onsite" | "remote" | "both" | "">("");
  const [city, setCity] = useState("");
  const [budgetType, setBudgetType] = useState<"fixed" | "hourly" | "open_to_quotes" | "">("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [timeline, setTimeline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [folder] = useState(() => `job-${Date.now()}`);

  const cat = cats.find((c) => c.id === catId);
  // PRD 5.8 budget rule: mandatory for some categories and for any remote / hybrid job.
  const budgetRequired = Boolean(cat?.budget_mandatory) || mode === "remote" || mode === "both";
  const effectiveBudget = budgetRequired && budgetType === "open_to_quotes" ? "" : budgetType;

  const problems = useMemo(() => {
    const p: string[] = [];
    if (!sub) p.push("תחום");
    if (title.trim().length < 5) p.push("כותרת (5 תווים לפחות)");
    if (description.trim().length < 50) p.push("תיאור (50 תווים לפחות)");
    if (!mode) p.push("איפה");
    if (mode && mode !== "remote" && city.trim().length < 2) p.push("עיר");
    if (!effectiveBudget) p.push("תקציב");
    if (effectiveBudget && effectiveBudget !== "open_to_quotes" && (!Number(min) || (max && Number(max) < Number(min)))) p.push("טווח תקציב");
    if (!timeline) p.push("מתי");
    return p;
  }, [sub, title, description, mode, city, effectiveBudget, min, max, timeline]);

  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-5" noValidate>
      {/* Values always submitted (also from the preview screen). */}
      <input type="hidden" name="sub" value={sub} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="skills" value={skills} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="city" value={city} />
      <input type="hidden" name="budgetType" value={effectiveBudget} />
      <input type="hidden" name="min" value={min} />
      <input type="hidden" name="max" value={max} />
      <input type="hidden" name="timeline" value={timeline} />
      <input type="hidden" name="startDate" value={startDate} />
      {attachments.map((a) => <input key={a} type="hidden" name="attachment" value={a} />)}

      {preview ? (
        <>
          <Card>
            <JobDetails
              job={{
                id: "preview", title, description, mode, city: city || null, budget_type: effectiveBudget || "open_to_quotes",
                budget_min: Number(min) || null, budget_max: Number(max || min) || null, timeline, start_date: startDate || null,
                skills: skills.split(",").map((s) => s.trim()).filter(Boolean), published_at: new Date().toISOString(),
                application_count: 0, subName: cat?.subs.find((s) => s.id === sub)?.name_he ?? "", poster,
              }}
            />
            {attachments.length ? <p className="mt-3 text-sm text-muted">{attachments.length} קבצים מצורפים</p> : null}
          </Card>
          <p className="text-sm text-muted">העבודה תהיה פתוחה 30 ימים, ואפשר להאריך פעם אחת ב-30 ימים נוספים. הפרסום חינם.</p>
          <FormError message={state.error} />
          <Button type="submit" disabled={pending}>{pending ? "מפרסמים…" : "פרסום העבודה"}</Button>
          <Button type="button" variant="ghost" onClick={() => setPreview(false)} disabled={pending}>חזרה לעריכה</Button>
        </>
      ) : (
        <>
          <Card className="flex flex-col gap-4">
            <h2 className="font-bold">מה צריך?</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="קטגוריה" htmlFor="cat">
                <select id="cat" value={catId} onChange={(e) => { setCatId(Number(e.target.value) || ""); setSub(""); }} className="min-h-12 rounded-xl border border-border bg-surface px-3">
                  <option value="">בחירה…</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name_he}</option>)}
                </select>
              </Field>
              <Field label="תחום" htmlFor="sub">
                <select id="sub" value={sub} disabled={!cat} onChange={(e) => setSub(Number(e.target.value) || "")} className="min-h-12 rounded-xl border border-border bg-surface px-3 disabled:opacity-50">
                  <option value="">בחירה…</option>
                  {cat?.subs.map((s) => <option key={s.id} value={s.id}>{s.name_he}</option>)}
                </select>
              </Field>
            </div>
            <Field label="כותרת" htmlFor="title" hint={`${title.length}/80`}>
              <Input id="title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: התקנת עמדת טעינה בבית פרטי" />
            </Field>
            <Field label="תיאור" htmlFor="description" hint={`${description.length}/3000 · לפחות 50 תווים`}>
              <textarea id="description" maxLength={3000} value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-36 rounded-xl border border-border bg-surface p-3" placeholder="מה צריך לעשות, היקף, דרישות מיוחדות…" />
            </Field>
            <Field label="מיומנויות נדרשות (לא חובה, עד 5, מופרדות בפסיק)" htmlFor="skills">
              <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} />
            </Field>
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-bold">איפה?</h2>
            <fieldset className="grid grid-cols-3 gap-2">
              {(["onsite", "remote", "both"] as const).map((m) => (
                <label key={m} className={radioCls}>
                  <input type="radio" name="modePick" className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
                  {m === "onsite" ? "בשטח" : m === "remote" ? "מרחוק" : "שניהם"}
                </label>
              ))}
            </fieldset>
            {mode && mode !== "remote" ? (
              <Field label="עיר" htmlFor="city">
                <Input id="city" list="il-cities" value={city} onChange={(e) => setCity(e.target.value)} />
                <datalist id="il-cities">{IL_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
              </Field>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-bold">תקציב</h2>
            {budgetRequired ? <p className="text-sm text-muted">{mode === "remote" || mode === "both" ? "בעבודה מרחוק" : "בתחום הזה"} חובה לציין תקציב.</p> : null}
            <fieldset className="grid grid-cols-3 gap-2">
              {(["fixed", "hourly", "open_to_quotes"] as const).map((b) => (
                <label key={b} className={cx(radioCls, b === "open_to_quotes" && budgetRequired && "pointer-events-none opacity-40")}>
                  <input type="radio" name="budgetPick" className="sr-only" checked={effectiveBudget === b} disabled={b === "open_to_quotes" && budgetRequired} onChange={() => setBudgetType(b)} />
                  {b === "fixed" ? "מחיר לעבודה" : b === "hourly" ? "לשעה" : "הצעות מחיר"}
                </label>
              ))}
            </fieldset>
            {effectiveBudget && effectiveBudget !== "open_to_quotes" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="מ- (₪)" htmlFor="min"><Input id="min" inputMode="numeric" dir="ltr" className="text-left" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} /></Field>
                <Field label="עד (₪)" htmlFor="max" hint="לא חובה"><Input id="max" inputMode="numeric" dir="ltr" className="text-left" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} /></Field>
              </div>
            ) : null}
          </Card>

          <Card className="flex flex-col gap-4">
            <h2 className="font-bold">מתי?</h2>
            <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[["asap", "דחוף"], ["week", "תוך שבוע"], ["month", "תוך חודש"], ["flexible", "גמיש"]].map(([v, l]) => (
                <label key={v} className={radioCls}>
                  <input type="radio" name="timelinePick" className="sr-only" checked={timeline === v} onChange={() => setTimeline(v)} />
                  {l}
                </label>
              ))}
            </fieldset>
            <Field label="תאריך התחלה (לא חובה)" htmlFor="startDate">
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="max-w-52" />
            </Field>
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-bold">קבצים מצורפים (לא חובה)</h2>
            <FileUpload bucket="job-attachments" userId={userId} folder={folder} accept={ATTACH_TYPES} maxFiles={3} maxMb={10}
              label="תמונות או מסמכים" hint="עד 3 קבצים · PDF או תמונה · נגישים רק למשתמשים מחוברים" onChange={(f) => setAttachments(f.map((x) => x.path))} />
          </Card>

          {problems.length ? <p className="text-sm text-muted">חסר: {problems.join(", ")}</p> : null}
          <Button type="button" disabled={problems.length > 0} onClick={() => setPreview(true)}>תצוגה מקדימה</Button>
        </>
      )}
    </form>
  );
}
