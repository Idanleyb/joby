import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { jobMatchesProvider } from "@/lib/jobs";
import { JobCard } from "@/components/job-view";
import { cx } from "@/components/ui";
import { SaveButton } from "./save-button";

export const metadata: Metadata = { title: "עבודות · Joby" };

type SP = { tab?: string; cat?: string; remote?: string; budget?: string; sort?: string };
const chip = (on: boolean) => cx("rounded-full border px-3 py-1.5 text-sm font-semibold", on ? "border-accent bg-accent/15" : "border-border bg-surface");

export default async function JobsFeedPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: provider }, { data: mySubs }, { data: saves }, { data: cats }] = await Promise.all([
    user ? supabase.from("provider_profiles").select("city, radius_km, works_onsite, works_remote").eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("provider_subcategories").select("subcategory_id").eq("provider_id", user.id) : Promise.resolve({ data: [] as { subcategory_id: number }[] }),
    user ? supabase.from("job_saves").select("job_id").eq("user_id", user.id) : Promise.resolve({ data: [] as { job_id: string }[] }),
    supabase.from("categories").select("id, name_he").eq("active", true).order("sort_order"),
  ]);
  const savedIds = new Set((saves ?? []).map((s) => s.job_id));
  const canMatch = Boolean(provider && mySubs?.length);
  const tab = sp.tab === "saved" && user ? "saved" : sp.tab === "new" || !canMatch ? "new" : "match";

  let q = supabase
    .from("jobs")
    .select("id, title, mode, city, budget_type, budget_min, budget_max, timeline, published_at, application_count, subcategory_id, on_behalf_name, sub:subcategories!inner(name_he, category_id), poster:poster_profiles(display_name, poster_type, jobs_posted, jobs_closed, hires, rating_avg, rating_count)")
    .eq("status", "open")
    .gt("expires_at", new Date().toISOString())
    .limit(300);
  if (tab === "saved") q = q.in("id", savedIds.size ? [...savedIds] : ["00000000-0000-0000-0000-000000000000"]);
  if (sp.cat) q = q.eq("sub.category_id", Number(sp.cat));
  if (sp.remote) q = q.in("mode", ["remote", "both"]);
  if (sp.budget) q = q.neq("budget_type", "open_to_quotes");
  q = sp.sort === "budget" ? q.order("budget_max", { ascending: false, nullsFirst: false }) : q.order("published_at", { ascending: false });
  const { data: rows } = await q;

  const subs = (mySubs ?? []).map((s) => s.subcategory_id);
  const jobs = (rows ?? []).filter((j) => tab !== "match" || jobMatchesProvider(j, { ...provider!, subs }));

  const href = (patch: Partial<SP>) => {
    const next = { ...sp, ...patch };
    const p = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/jobs${p.size ? `?${p}` : ""}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold sm:text-3xl">עבודות</h1>
        <Link href="/jobs/new" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-contrast">פרסום עבודה</Link>
      </header>

      <nav className="flex gap-1 rounded-xl bg-background p-1 text-sm font-semibold" aria-label="תצוגה">
        {canMatch ? <Link href={href({ tab: undefined })} className={cx("flex-1 rounded-lg px-3 py-2 text-center", tab === "match" && "bg-surface shadow-sm")}>מתאימות לי</Link> : null}
        <Link href={href({ tab: "new" })} className={cx("flex-1 rounded-lg px-3 py-2 text-center", tab === "new" && "bg-surface shadow-sm")}>הכי חדשות</Link>
        {user ? <Link href={href({ tab: "saved" })} className={cx("flex-1 rounded-lg px-3 py-2 text-center", tab === "saved" && "bg-surface shadow-sm")}>שמורות ({savedIds.size})</Link> : null}
      </nav>

      <div className="flex flex-wrap gap-2">
        <Link href={href({ remote: sp.remote ? undefined : "1" })} className={chip(Boolean(sp.remote))}>מרחוק</Link>
        <Link href={href({ budget: sp.budget ? undefined : "1" })} className={chip(Boolean(sp.budget))}>עם תקציב</Link>
        <Link href={href({ sort: sp.sort === "budget" ? undefined : "budget" })} className={chip(sp.sort === "budget")}>תקציב גבוה קודם</Link>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={href({ cat: undefined })} className={cx(chip(!sp.cat), "shrink-0")}>הכול</Link>
        {cats?.map((c) => <Link key={c.id} href={href({ cat: String(c.id) })} className={cx(chip(sp.cat === String(c.id)), "shrink-0")}>{c.name_he}</Link>)}
      </div>

      {tab === "match" ? <p className="text-sm text-muted">עבודות בתחומים ובאזור שבחרת בפרופיל.</p> : null}
      {!jobs.length ? (
        <p className="rounded-2xl bg-background p-6 text-center text-muted">
          {tab === "saved" ? "אין עבודות שמורות." : tab === "match" ? <>אין כרגע עבודות שמתאימות לתחומים ולאזור שלך. <Link href={href({ tab: "new" })} className="underline">לכל העבודות</Link></> : "אין עבודות פתוחות כרגע."}
        </p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {jobs.map((j) => (
          <li key={j.id}>
            <JobCard
              job={{ ...j, subName: j.sub.name_he, onBehalfName: j.on_behalf_name }}
              action={user ? <SaveButton jobId={j.id} saved={savedIds.has(j.id)} /> : undefined}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
