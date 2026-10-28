"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, cx } from "@/components/ui";

export type UploadedFile = { path: string; name: string; size: number };

const MB = 1024 * 1024;
const safeName = (n: string) => n.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-60) || "file";

/**
 * Uploads straight from the browser to Supabase Storage (the server never relays
 * large files). Files go to <bucket>/<userId>/<folder>/… as storage policies require.
 */
export function FileUpload({
  bucket, userId, folder, accept, maxFiles, maxMb, label, hint, onChange, disabled,
}: {
  bucket: string; userId: string; folder: string; accept: string[]; maxFiles: number; maxMb: number;
  label: string; hint?: string; onChange: (files: UploadedFile[]) => void; disabled?: boolean;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const supabase = useRef(createClient()).current;
  const seq = useRef(0);

  async function onPick(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    const picked = Array.from(list);
    if (files.length + picked.length > maxFiles) return setError(`אפשר להעלות עד ${maxFiles} קבצים.`);
    for (const f of picked) {
      if (!accept.includes(f.type)) return setError(`סוג הקובץ "${f.name}" אינו נתמך.`);
      if (f.size > maxMb * MB) return setError(`הקובץ "${f.name}" גדול מ-${maxMb}MB.`);
    }
    setBusy(true);
    const added: UploadedFile[] = [];
    for (const [i, f] of picked.entries()) {
      seq.current += 1;
      const path = `${userId}/${folder}/${seq.current}-${i}-${safeName(f.name)}`;
      const { error } = await supabase.storage.from(bucket).upload(path, f, { contentType: f.type, upsert: false });
      if (error) {
        setError(`ההעלאה של "${f.name}" נכשלה. נסו שוב.`);
        break;
      }
      added.push({ path, name: f.name, size: f.size });
    }
    const next = [...files, ...added];
    setFiles(next);
    onChange(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  function remove(path: string) {
    const next = files.filter((f) => f.path !== path);
    setFiles(next);
    onChange(next);
    void supabase.storage.from(bucket).remove([path]);
  }

  return (
    <div className="flex flex-col gap-3">
      <label
        className={cx(
          "flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-background px-4 py-8 text-center",
          "hover:border-foreground focus-within:border-foreground",
          (busy || disabled) && "pointer-events-none opacity-60",
        )}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-8 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-semibold">{busy ? "מעלים…" : label}</span>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
        <input
          ref={input}
          type="file"
          className="sr-only"
          multiple={maxFiles > 1}
          accept={accept.join(",")}
          onChange={(e) => onPick(e.target.files)}
          disabled={busy || disabled}
        />
      </label>
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
      {files.length ? (
        <ul className="flex flex-col gap-2">
          {files.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm">
              <span className="truncate" dir="ltr">{f.name}</span>
              <Button type="button" variant="ghost" className="min-h-0 px-2 py-1 text-xs" onClick={() => remove(f.path)} disabled={disabled}>
                הסרה
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
