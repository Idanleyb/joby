"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { IL_CITIES } from "@/lib/cities";
import { Input } from "@/components/ui";

type Cat = { id: number; name_he: string; subs: { id: number; name_he: string }[] };
const sel = "min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";

/** Category, subcategory and area (town + radius) filters kept in the URL. */
export function SearchFilters({ cats, children, defaultRadius = "25" }: { cats: Cat[]; children?: React.ReactNode; defaultRadius?: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [city, setCity] = useState(sp.get("city") ?? "");
  const cat = cats.find((c) => String(c.id) === sp.get("cat"));

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    start(() => router.replace(`${path}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const applyCity = () => update({ city: city.trim() || null, radius: city.trim() ? sp.get("radius") ?? defaultRadius : null });

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3" aria-busy={pending}>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold">קטגוריה
          <select aria-label="קטגוריה" className={sel} value={sp.get("cat") ?? ""} onChange={(e) => update({ cat: e.target.value || null, sub: null })}>
            <option value="">הכול</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name_he}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">תחום
          <select aria-label="תחום" className={sel} value={sp.get("sub") ?? ""} disabled={!cat} onChange={(e) => update({ sub: e.target.value || null })}>
            <option value="">הכול</option>
            {cat?.subs.map((s) => <option key={s.id} value={s.id}>{s.name_he}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">אזור (עיר)
          <Input aria-label="אזור (עיר)" list="filter-cities" value={city} onChange={(e) => setCity(e.target.value)} onBlur={applyCity}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCity(); } }} placeholder="כל הארץ" className="min-h-11 text-sm" />
          <datalist id="filter-cities">{IL_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">מרחק
          <select aria-label="מרחק" className={sel} value={sp.get("radius") ?? defaultRadius} disabled={!sp.get("city")} onChange={(e) => update({ radius: e.target.value })}>
            {["5", "10", "25", "50", "100"].map((r) => <option key={r} value={r}>עד {r} ק״מ</option>)}
          </select>
        </label>
      </div>
      {children}
    </div>
  );
}

/** A toggle chip or a select bound to one URL parameter. */
export function ParamChip({ name, value = "1", label }: { name: string; value?: string; label: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const on = sp.get(name) === value;
  return (
    <button type="button" aria-pressed={on}
      onClick={() => { const n = new URLSearchParams(sp.toString()); if (on) n.delete(name); else n.set(name, value); router.replace(`${path}${n.size ? `?${n}` : ""}`, { scroll: false }); }}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? "border-accent bg-accent/15" : "border-border bg-surface"}`}>
      {label}
    </button>
  );
}

export function SortSelect({ options, fallback }: { options: [string, string][]; fallback: string }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm font-semibold">מיון
      <select aria-label="מיון" className="min-h-10 rounded-xl border border-border bg-surface px-2 text-sm" value={sp.get("sort") ?? fallback}
        onChange={(e) => { const n = new URLSearchParams(sp.toString()); n.set("sort", e.target.value); router.replace(`${path}?${n}`, { scroll: false }); }}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
