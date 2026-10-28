"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { finishProfile, setPhoto, setShowDaysBand } from "./actions";

const TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoUpload({ userId, hasPhoto }: { userId: string; hasPhoto: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!TYPES.includes(file.type)) return setError("JPG, PNG או WEBP בלבד.");
    if (file.size > 2 * 1024 * 1024) return setError("התמונה גדולה מ-2MB.");
    seq.current += 1;
    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${userId}/avatar-${seq.current}-${file.size}.${ext}`;
    start(async () => {
      const { error } = await createClient().storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
      if (error) return setError("ההעלאה נכשלה. נסו שוב.");
      await setPhoto(path);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
        {pending ? "מעלים…" : hasPhoto ? "החלפת תמונה" : "העלאת תמונת פרופיל"}
      </Button>
      <input ref={input} type="file" accept={TYPES.join(",")} className="sr-only" aria-label="תמונת פרופיל" onChange={(e) => onPick(e.target.files?.[0])} />
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function DaysBandToggle({ checked }: { checked: boolean }) {
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" defaultChecked={checked} disabled={pending} onChange={(e) => start(() => setShowDaysBand(e.target.checked))} className="size-5 accent-[var(--brand)]" />
      להציג בפרופיל את טווח ימי המילואים (למשל ״60+ ימי מילואים״)
    </label>
  );
}

export function FinishButton({ disabled }: { disabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button type="button" disabled={disabled || pending} onClick={() => start(() => finishProfile())}>
      {pending ? "שומרים…" : "סיום ושמירת הפרופיל"}
    </Button>
  );
}
