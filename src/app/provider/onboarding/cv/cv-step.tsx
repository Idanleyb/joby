"use client";

import { useState, useTransition } from "react";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import { Button, Card, Field, Input } from "@/components/ui";
import type { CvReading } from "@/lib/ai/cv";
import { readUploadedCv, saveCvReview, skipCv, type CvRead } from "./actions";

const CV_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function CvStep({ userId, hasCv, hasProfileData }: { userId: string; hasCv: boolean; hasProfileData: boolean }) {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [result, setResult] = useState<CvRead | null>(null);
  const [pending, start] = useTransition();
  const [folder] = useState(() => `cv-${Date.now()}`);

  if (result?.ok) return <CvReview reading={result.reading} subNames={result.subNames} showReplace={hasProfileData} />;

  return (
    <Card className="flex flex-col gap-5">
      {hasCv && !file ? <p className="text-sm text-muted">כבר העליתם קורות חיים. אפשר להעלות קובץ חדש במקומו.</p> : null}
      <FileUpload
        bucket="cvs"
        userId={userId}
        folder={folder}
        accept={CV_TYPES}
        maxFiles={1}
        maxMb={5}
        label="העלאת קורות חיים"
        hint="PDF או Word (DOCX) · עד 5MB · עברית או אנגלית"
        onChange={(f) => setFile(f[0] ?? null)}
        disabled={pending}
      />
      {result && !result.ok ? (
        <p role="status" className="rounded-xl bg-info px-4 py-3 text-sm">
          {result.reason === "ai_failed" ? "לא הצלחנו לקרוא את הקובץ אוטומטית." : "מילוי אוטומטי אינו זמין כרגע."} הקובץ נשמר
          בפרופיל — נמשיך במילוי ידני.
          <span dir="ltr" className="mt-1 block text-left text-xs text-muted">{result.code}</span>
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        {result && !result.ok ? (
          <Button type="button" onClick={() => start(() => skipCv())} disabled={pending}>המשך</Button>
        ) : (
          <Button type="button" disabled={!file || pending} onClick={() => start(async () => setResult(await readUploadedCv(file!.path)))}>
            {pending ? "קוראים את קורות החיים…" : "מלאו לי את הפרופיל"}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => start(() => skipCv())} disabled={pending}>
          אמלא ידנית
        </Button>
      </div>
    </Card>
  );
}

function CvReview({ reading, subNames, showReplace }: { reading: CvReading; subNames: Record<string, string>; showReplace: boolean }) {
  const [exp, setExp] = useState(reading.experience);
  const [edu, setEdu] = useState(reading.education);
  const [pending, start] = useTransition();
  const tag = <span className="rounded-full border border-action-border bg-action px-2 py-0.5 text-[11px] font-semibold text-foreground">הצעת AI</span>;

  return (
    <form action={(fd) => start(() => saveCvReview(fd))} className="flex flex-col gap-5">
      <Card className="flex flex-col gap-5">
        <p className="font-bold">הנה מה שמצאנו — בדקו ותקנו לפני השמירה</p>
        <Field label="כותרת" htmlFor="headline">
          <Input id="headline" name="headline" maxLength={70} defaultValue={reading.headline} />
        </Field>
        <Field label="על עצמי" htmlFor="bio">
          <textarea id="bio" name="bio" maxLength={1000} defaultValue={reading.bio} className="min-h-32 rounded-xl border border-border bg-surface p-3" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="שנות ניסיון" htmlFor="years">
            <Input id="years" name="years" inputMode="numeric" defaultValue={reading.years_experience ?? ""} />
          </Field>
          <Field label="שפות" htmlFor="languages">
            <Input id="languages" name="languages" defaultValue={reading.languages.join(", ")} />
          </Field>
        </div>
        <Field label="מיומנויות (מופרדות בפסיק)" htmlFor="skills">
          <textarea id="skills" name="skills" defaultValue={reading.skills.join(", ")} className="min-h-20 rounded-xl border border-border bg-surface p-3" />
        </Field>
        {reading.suggested_subcategories.length ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 flex items-center gap-2 text-sm font-semibold">תחומים מוצעים {tag}</legend>
            {reading.suggested_subcategories.map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="sub" value={s} defaultChecked className="size-5 accent-[var(--brand)]" />
                {subNames[s] ?? s}
              </label>
            ))}
          </fieldset>
        ) : null}
      </Card>

      {exp.length ? (
        <Card className="flex flex-col gap-3">
          <p className="font-semibold">ניסיון</p>
          {exp.map((e, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Input name="expTitle" aria-label="תפקיד" defaultValue={e.title} />
              <Input name="expOrg" aria-label="מקום" defaultValue={e.organization ?? ""} />
              <Button type="button" variant="ghost" className="min-h-0 px-2" onClick={() => setExp(exp.filter((_, j) => j !== i))}>✕</Button>
              <input type="hidden" name="expStart" value={e.start_year ?? ""} />
              <input type="hidden" name="expEnd" value={e.end_year ?? ""} />
            </div>
          ))}
        </Card>
      ) : null}
      {edu.length ? (
        <Card className="flex flex-col gap-3">
          <p className="font-semibold">השכלה</p>
          {edu.map((e, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
              <Input name="eduDegree" aria-label="תואר / הסמכה" defaultValue={e.degree} />
              <Input name="eduInst" aria-label="מוסד" defaultValue={e.institution ?? ""} />
              <Button type="button" variant="ghost" className="min-h-0 px-2" onClick={() => setEdu(edu.filter((_, j) => j !== i))}>✕</Button>
              <input type="hidden" name="eduEnd" value={e.end_year ?? ""} />
            </div>
          ))}
        </Card>
      ) : null}

      <Card className="flex flex-col gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="cvVisible" defaultChecked className="size-5 accent-[var(--brand)]" />
          מפרסמים יוכלו להוריד את קורות החיים שלי
        </label>
        {showReplace ? (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="replace" className="size-5 accent-[var(--brand)]" />
            להחליף את הפרטים שכבר מילאתי בפרופיל
          </label>
        ) : null}
      </Card>
      <Button type="submit" disabled={pending}>{pending ? "שומרים…" : "שמירה והמשך"}</Button>
    </form>
  );
}
