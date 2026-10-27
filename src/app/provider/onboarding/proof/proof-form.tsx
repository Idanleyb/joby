"use client";

import { useState, useTransition } from "react";
import { FileUpload, type UploadedFile } from "@/components/file-upload";
import { Button, Card, Field, FormError, Input } from "@/components/ui";
import { analyzeForms, submitAnalyzed, submitManual, submitSpouseProof, type Analysis } from "./actions";

const DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const KIND_LABEL: Record<string, string> = {
  form_3010: "טופס 3010",
  cumulative_confirmation: "אישור מצטבר",
  other: "לא אישור מילואים",
};

export function ReservistProofForm({ userId }: { userId: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [note, setNote] = useState("");
  const [manualDays, setManualDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [folder] = useState(() => `3010-${Date.now()}`);

  const read = () =>
    start(async () => {
      setError(null);
      setAnalysis(await analyzeForms(files.map((f) => f.path)));
    });

  const confirm = () =>
    start(async () => {
      setError(null);
      if (analysis?.mode === "ai") {
        const r = await submitAnalyzed(analysis.token, note);
        if (r?.error) setError(r.error);
      } else {
        const r = await submitManual(files.map((f) => f.path), Number(manualDays), note);
        if (r?.error) setError(r.error);
      }
    });

  if (!analysis) {
    return (
      <Card className="flex flex-col gap-5">
        <FileUpload
          bucket="verification-docs"
          userId={userId}
          folder={folder}
          accept={DOC_TYPES}
          maxFiles={15}
          maxMb={10}
          label="העלאת טופס 3010"
          hint="PDF, JPG או PNG · עד 15 קבצים · עד 10MB לקובץ"
          onChange={setFiles}
          disabled={pending}
        />
        <div className="rounded-xl bg-background p-4 text-sm text-muted">
          <p className="font-semibold text-foreground">איזה טופס?</p>
          <p>אישור מצטבר אחד מאתר המילואים (האזור האישי), או כמה טופסי 3010 — אחד לכל צו. נספור רק ימים מ-7 באוקטובר 2023, וימים חופפים ייספרו פעם אחת.</p>
        </div>
        <FormError message={error} />
        <Button type="button" onClick={read} disabled={!files.length || pending}>
          {pending ? "קוראים את הטפסים…" : "המשך"}
        </Button>
      </Card>
    );
  }

  if (analysis.mode === "manual") {
    return (
      <Card className="flex flex-col gap-5">
        <p className="text-sm text-muted">
          {analysis.reason === "ai_failed" ? "לא הצלחנו לקרוא את הטפסים אוטומטית." : "קריאה אוטומטית אינה זמינה כרגע."} הזינו את מספר
          הימים הכולל מאז 7 באוקטובר 2023, והצוות יבדוק מול המסמכים.
        </p>
        <Field label="סך ימי מילואים מאז 7.10.2023" htmlFor="days">
          <Input id="days" inputMode="numeric" dir="ltr" className="text-left" value={manualDays} onChange={(e) => setManualDays(e.target.value.replace(/\D/g, ""))} />
        </Field>
        <Field label="הערה לבודק (לא חובה)" htmlFor="note">
          <textarea id="note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20 rounded-xl border border-border bg-surface p-3" />
        </Field>
        <FormError message={error} />
        <Button type="button" onClick={confirm} disabled={pending || !manualDays}>{pending ? "שולחים…" : "שליחה לאימות"}</Button>
      </Card>
    );
  }

  const below = analysis.days < 30;
  const okCount = analysis.files.filter((f) => f.ok).length;
  return (
    <Card className="flex flex-col gap-5">
      <div className={below ? "rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30" : "rounded-xl bg-background p-4"}>
        <p className="text-lg font-bold">
          ספרנו {analysis.days} ימים {okCount === 1 ? "בטופס אחד" : `ב-${okCount} טפסים`}
        </p>
        {below ? (
          <p className="mt-1 text-sm">פחות מ-30 ימים. אם חסרים טפסים, חזרו והעלו אותם. אפשר גם לשלוח כך עם הערה, והצוות יבדוק.</p>
        ) : (
          <p className="mt-1 text-sm text-muted">ימים מ-7 באוקטובר 2023 בלבד, חפיפות נספרו פעם אחת.</p>
        )}
        {analysis.multipleIds ? <p className="mt-1 text-sm">שימו לב: בטפסים מופיעים מספרי זהות שונים.</p> : null}
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {analysis.files.map((f, i) => (
          <li key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <span className="flex flex-col">
              <span dir="ltr" className="truncate text-left">{f.name}</span>
              {f.fullName ? <span className="text-muted">{f.fullName}</span> : null}
            </span>
            <span className={f.ok ? "font-semibold text-emerald-700 dark:text-emerald-400" : "font-semibold text-red-600"}>
              {f.ok ? KIND_LABEL[f.kind] : f.kind === "other" ? KIND_LABEL.other : "לא קריא"}
            </span>
          </li>
        ))}
      </ul>
      <Field label="משהו לא נכון? כתבו לבודק (לא חובה)" htmlFor="note">
        <textarea id="note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20 rounded-xl border border-border bg-surface p-3" />
      </Field>
      <FormError message={error} />
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={confirm} disabled={pending}>{pending ? "שולחים…" : "אישור ושליחה לאימות"}</Button>
        <Button type="button" variant="ghost" onClick={() => setAnalysis(null)} disabled={pending}>חזרה להעלאת קבצים</Button>
      </div>
    </Card>
  );
}

export function SpouseProofForm({ userId }: { userId: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [folder] = useState(() => `spouse-${Date.now()}`);

  return (
    <Card className="flex flex-col gap-5">
      <FileUpload
        bucket="verification-docs"
        userId={userId}
        folder={folder}
        accept={DOC_TYPES}
        maxFiles={5}
        maxMb={10}
        label="העלאת אישור זוגיות"
        hint="תעודת נישואין, ספח תעודת זהות שבו מופיע/ה בן/בת הזוג, או לידועים בציבור — תצהיר נוטריוני או מסמך רשמי"
        onChange={setFiles}
        disabled={pending}
      />
      <Field label="הערה לבודק (לא חובה)" htmlFor="note">
        <textarea id="note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20 rounded-xl border border-border bg-surface p-3" />
      </Field>
      <FormError message={error} />
      <Button
        type="button"
        disabled={!files.length || pending}
        onClick={() =>
          start(async () => {
            const r = await submitSpouseProof(files.map((f) => f.path), note);
            if (r?.error) setError(r.error);
          })
        }
      >
        {pending ? "שולחים…" : "שליחה לאימות"}
      </Button>
    </Card>
  );
}
