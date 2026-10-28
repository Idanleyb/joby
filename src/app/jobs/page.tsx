import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { loadCategoryTree } from "@/lib/categories";
import { JobCard } from "@/components/job-view";
import { ParamChip, SearchFilters, SortSelect } from "@/components/search-filters";
import { cx } from "@/components/ui";
import { SaveButton } from "./save-button";

export const metadata: Metadata = { title: "הזדמנויות · Joby" };

type SP = { tab?: string; cat?: string; sub?: string; city?: string; radius?: string; remote?: string; budget?: string; sort?: string };
const NONE = ["00000000-0000-0000-0000-000000000000"];

export default async function JobsFeedPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: provider }, { data: saves }, cats, { data: costRow }] = await Promise.all([
    user ? supabase.from("provider_profiles").select("user_id").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("job_saves").select("job_id").eq("user_id", user.id) : Promise.resolve({ data: [] as { job_id: string }[] }),
    loadCategoryTree(),
    supabase.from("app_settings").select("value").eq("key", "apply_cost").maybeSingle(),
  ]);
  const applyCost = Number(costRow?.value ?? 10);
  const savedIds = new Set((saves ?? []).map((s) => s.job_id));
  const canMatch = Boolean(provider);
  const tab = sp.tab === "saved" && user ? "saved" : sp.tab === "new" || !canMatch ? "new" : "match";

  let q = supabase
    .from("jobs")
    .select("id, title, mode, city, budget_type, budget_min, budget_max, timeline, published_at, application_count, subcategory_id, on_behalf_name, sub:subcategories!inner(name_he, category_id), poster:poster_profiles(display_name, poster_type, jobs_posted, jobs_closed, hires, rating_avg, rating_count)")
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .limit(300);
  if (tab === "saved") q = q.in("id", savedIds.size ? [...savedIds] : NONE);
  if (tab === "match") {
    const { data: ids } = await supabase.rpc("my_matching_jobs");
    q = q.in("id", (ids as string[] | null)?.length ? (ids as string[]) : NONE);
  }
  if (sp.city?.trim()) {
    const { data: near } = await supabase.rpc("jobs_near", { p_city: sp.city.trim(), p_radius: Number(sp.radius) || 25 });
    const nearIds = (near as string[] | null) ?? [];
    // Remote jobs are not tied to a place: keep them only when "remote" is on.
    q = sp.remote ? q.or(`id.in.(${(nearIds.length ? nearIds : NONE).join(",")}),mode.in.(remote,both)`) : q.in("id", nearIds.length ? nearIds : NONE);
  } else if (sp.remote) q = q.in("mode", ["remote", "both"]);
  if (sp.sub) q = q.eq("subcategory_id", Number(sp.sub));
  else if (sp.cat) q = q.eq("sub.category_id", Number(sp.cat));
  if (sp.budget) q = q.neq("budget_type", "open_to_quotes");
  q = sp.sort === "budget" ? q.order("budget_max", { ascending: false, nullsFirst: false }) : q.order("published_at", { ascending: false });
  const { data: jobs } = await q;

  const href = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const p = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/jobs${p.size ? `?${p}` : ""}`;
  };
  const filtered = Boolean(sp.cat || sp.sub || sp.city || sp.remote || sp.budget);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-[26px] font-bold sm:text-3xl">הזדמנויות</h1>
        <Link href="/jobs/new" className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold">פרסום עבודה</Link>
      </header>

      <nav className="flex gap-1 rounded-xl bg-background p-1 text-sm font-semibold" aria-label="תצוגה">
        {canMatch ? <Link href={href({ tab: undefined })} className={cx("flex-1 rounded-lg px-3 py-2 text-center", tab === "match" && "bg-surface shadow-sm")}>מתאימות לי</Link> : null}
        <Link href={href({ tab: "new" })} className={cx("flex-1 rounded-lg px-3 py-2 text-center", tab === "new" && "bg-surface shadow-sm")}>הכי חדשות</Link>
        {user ? <Link href={href({ tab: "saved" })} className={cx("flex-1 rounded-lg px-3 py-2 text-center", tab === "saved" && "bg-surface shadow-sm")}>שמורות ({savedIds.size})</Link> : null}
      </nav>

      <Suspense>
        <SearchFilters cats={cats}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <ParamChip name="remote" label="מרחוק" />
              <ParamChip name="budget" label="עם תקציב" />
            </div>
            <SortSelect options={[["new", "הכי חדשות"], ["budget", "תקציב גבוה"]]} fallback="new" />
          </div>
        </SearchFilters>
      </Suspense>

      {tab === "match" ? <p className="text-sm text-muted">עבודות בתחומים ובאזור שבחרת בפרופיל.</p> : null}
      {!jobs?.length ? (
        <p className="rounded-2xl bg-background p-6 text-center text-muted">
          {tab === "saved" ? "אין עבודות שמורות." : filtered ? "אין עבודות שמתאימות לסינון." : tab === "match" ? <>אין כרגע עבודות שמתאימות לתחומים ולאזור שלך. <Link href={href({ tab: "new" })} className="underline">לכל העבודות</Link></> : "אין עבודות פתוחות כרגע."}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {jobs?.map((j) => (
          <li key={j.id}>
            <JobCard
              job={{ ...j, subName: j.sub.name_he, onBehalfName: j.on_behalf_name }}
              applyCost={applyCost}
              action={user ? <SaveButton jobId={j.id} saved={savedIds.has(j.id)} /> : undefined}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
