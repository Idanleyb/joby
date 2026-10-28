"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveGallery } from "./actions";
import { Button } from "@/components/ui";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX = 6;
const fileId = () => crypto.randomUUID();

/** Up to 6 photos of past work, uploaded straight to the public "portfolio" bucket. */
export function GalleryEditor({ userId, initial }: { userId: string; initial: { path: string; url: string }[] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const supabase = useRef(createClient()).current;

  const persist = (next: { path: string; url: string }[]) =>
    start(async () => {
      const r = await saveGallery(next.map((i) => i.path));
      if (r.error) setError(r.error);
    });

  async function add(list: FileList | null) {
    if (!list?.length) return;
    setError(undefined);
    const files = Array.from(list).slice(0, MAX - items.length);
    if (!files.length) return setError(`אפשר עד ${MAX} תמונות.`);
    setBusy(true);
    const added: { path: string; url: string }[] = [];
    for (const f of files) {
      if (!TYPES.includes(f.type)) { setError("רק תמונות JPG, PNG או WEBP."); continue; }
      if (f.size > 5 * 1024 * 1024) { setError(`"${f.name}" גדולה מ-5MB.`); continue; }
      const path = `${userId}/${fileId()}.${f.type.split("/")[1]}`;
      const { error: e } = await supabase.storage.from("portfolio").upload(path, f, { contentType: f.type });
      if (e) { setError("ההעלאה נכשלה. נסו שוב."); continue; }
      added.push({ path, url: supabase.storage.from("portfolio").getPublicUrl(path).data.publicUrl });
    }
    setBusy(false);
    if (input.current) input.current.value = "";
    if (added.length) {
      const next = [...items, ...added];
      setItems(next);
      persist(next);
    }
  }

  function remove(path: string) {
    const next = items.filter((i) => i.path !== path);
    setItems(next);
    persist(next);
    void supabase.storage.from("portfolio").remove([path]);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length ? (
        <div className="grid grid-cols-3 gap-2">
          {items.map((i) => (
            <div key={i.path} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.url} alt="" className="aspect-square w-full rounded-xl border border-border object-cover" />
              <button type="button" onClick={() => remove(i.path)} aria-label="הסרת התמונה"
                className="absolute end-1 top-1 rounded-full bg-black/60 px-2 text-sm font-bold text-white">×</button>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-muted">תמונות של עבודות קודמות עוזרות למפרסמים לבחור.</p>}
      <input ref={input} type="file" accept={TYPES.join(",")} multiple className="sr-only" id="gallery-input" onChange={(e) => add(e.target.files)} />
      {items.length < MAX ? (
        <Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "מעלים…" : `הוספת תמונות (${items.length}/${MAX})`}
        </Button>
      ) : null}
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}
