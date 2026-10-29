import type { Metadata } from "next";
import { Suspense } from "react";
import { getAuthUser } from "@/lib/onboarding";
import { createClient } from "@/lib/supabase/server";
import { loadCategoryTree } from "@/lib/categories";
import { ProviderCard, loadProviderCards } from "@/components/provider-card";
import { ParamChip, SearchFilters, SortSelect } from "@/components/search-filters";

export const metadata: Metadata = { title: "נותני שירות · Joby" };

type SP = { cat?: string; sub?: string; city?: string; radius?: string; sort?: string; available?: string };
const SORTS: [string, string][] = [["rating", "דירוג"], ["distance", "מרחק"], ["price", "מחיר (מהזול)"], ["name", "א–ת"]];

export default async function ProvidersSearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const cats = await loadCategoryTree();

  // Distance needs a town: the one in the filter, else the signed-in poster's town.
  let origin = sp.city?.trim() || null;
  if (!origin) {
    const user = await getAuthUser();
    if (user) origin = (await supabase.from("poster_profiles").select("city").eq("user_id", user.id).maybeSingle()).data?.city ?? null;
  }
  const sort = SORTS.some(([v]) => v === sp.sort) ? sp.sort! : "rating";
  const { data: rows, error } = await supabase.rpc("search_providers", {
    p_category: Number(sp.cat) || undefined,
    p_subcategory: Number(sp.sub) || undefined,
    p_city: origin ?? undefined,
    p_radius: sp.city ? Number(sp.radius) || 25 : undefined,
    p_available_only: Boolean(sp.available),
    p_sort: sort,
  });
  const cards = await loadProviderCards(rows ?? []);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[26px] font-bold sm:text-3xl">נותני שירות</h1>
        <p className="text-sm text-muted">מילואימניקים מאומתים ובני/בנות זוגם.</p>
      </header>
      <Suspense>
        <SearchFilters cats={cats}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <ParamChip name="available" label="זמינים עכשיו" />
            <SortSelect options={SORTS} fallback="rating" />
          </div>
        </SearchFilters>
      </Suspense>
      {sort === "distance" && !origin ? <p className="text-sm text-muted">לבחירת מיון לפי מרחק, בחרו עיר באזור.</p> : null}
      {sort === "rating" ? <p className="text-xs text-muted">דירוג מוצג אחרי 3 חוות דעת לפחות; נותני שירות חדשים מופיעים אחריהם.</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">החיפוש נכשל. נסו שוב.</p> : null}
      <p className="text-sm font-semibold">{cards.length} תוצאות</p>
      {!cards.length ? <p className="rounded-2xl bg-background p-6 text-center text-muted">לא נמצאו נותני שירות. נסו להרחיב את האזור או לבחור קטגוריה אחרת.</p> : null}
      <ul className="flex flex-col gap-3">{cards.map((c) => <li key={c.user_id}><ProviderCard p={c} /></li>)}</ul>
    </main>
  );
}
