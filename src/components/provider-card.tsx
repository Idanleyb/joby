import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cx } from "@/components/ui";

export type ProviderCardData = Awaited<ReturnType<typeof loadProviderCards>>[number];

/** Loads card data for search results, keeping the search order. */
export async function loadProviderCards(rows: { user_id: string; distance_km: number | null; min_price: number | null }[]) {
  if (!rows.length) return [];
  const supabase = await createClient();
  const ids = rows.map((r) => r.user_id);
  const [{ data: profiles }, { data: subs }] = await Promise.all([
    supabase.from("provider_profiles")
      .select("user_id, display_name, headline, photo_path, city, works_remote, provider_type, rating_avg, rating_count, jobs_done, availability, busy_until")
      .in("user_id", ids),
    supabase.from("provider_subcategories").select("provider_id, subcategories(name_he)").in("provider_id", ids),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  return rows.flatMap((r) => {
    const p = profiles?.find((x) => x.user_id === r.user_id);
    if (!p) return [];
    return [{
      ...p, distance: r.distance_km, minPrice: r.min_price,
      photoUrl: p.photo_path ? supabase.storage.from("avatars").getPublicUrl(p.photo_path).data.publicUrl : null,
      subs: (subs ?? []).filter((s) => s.provider_id === p.user_id).map((s) => s.subcategories?.name_he).filter(Boolean) as string[],
      busy: p.availability === "busy" && (!p.busy_until || p.busy_until >= today),
    }];
  });
}

export function ProviderCard({ p }: { p: ProviderCardData }) {
  return (
    <Link href={`/providers/${p.user_id}`} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-background">
      {p.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.photoUrl} alt="" className="size-14 shrink-0 rounded-full border border-border object-cover" />
      ) : (
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-brand-contrast">{p.display_name?.[0]}</span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-bold"><bdi>{p.display_name}</bdi> <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">✓ {p.provider_type === "spouse" ? "בן/בת זוג" : "מילואימניק"}</span></span>
          <span className={cx("shrink-0 text-xs font-semibold", p.busy ? "text-muted" : "text-emerald-700 dark:text-emerald-400")}>{p.busy ? "עסוק/ה" : "● זמין/ה"}</span>
        </div>
        {p.headline ? <p className="truncate text-sm">{p.headline}</p> : null}
        <p className="text-xs text-muted">
          {[p.subs.slice(0, 2).join(", "), p.city ? `📍 ${p.city}${p.distance != null && p.distance > 0 ? ` · ${Math.round(p.distance)} ק״מ` : ""}` : null, p.works_remote ? "גם מרחוק" : null].filter(Boolean).join(" · ")}
        </p>
        <p className="text-sm">
          {p.rating_count >= 3 && p.rating_avg ? <b>★ {p.rating_avg} <span className="font-normal text-muted">({p.rating_count})</span></b> : <span className="text-muted">חדש/ה</span>}
          {p.jobs_done ? <span className="text-muted"> · {p.jobs_done} עבודות</span> : null}
          {p.minPrice ? <span> · החל מ-<b>₪{p.minPrice.toLocaleString("he-IL")}</b></span> : null}
        </p>
      </div>
    </Link>
  );
}
