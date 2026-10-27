import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { requirePoster } from "@/lib/poster";
import { PageShell } from "@/components/ui";
import { JobForm } from "./job-form";

export const metadata: Metadata = { title: "פרסום עבודה · Joby" };

export default async function NewJobPage() {
  const me = await requirePoster("/jobs/new");
  const supabase = await createClient();
  const [{ data: cats }, { data: subs }, { data: poster }] = await Promise.all([
    supabase.from("categories").select("id, name_he, budget_mandatory").eq("active", true).order("sort_order"),
    supabase.from("subcategories").select("id, category_id, name_he").eq("active", true).order("sort_order"),
    supabase.from("poster_profiles").select("display_name, poster_type, jobs_posted, jobs_closed, hires, rating_avg, rating_count").eq("user_id", me.userId).single(),
  ]);
  const grouped = (cats ?? []).map((c) => ({ ...c, subs: (subs ?? []).filter((s) => s.category_id === c.id) }));
  return (
    <PageShell title="פרסום עבודה" subtitle="חינם. מילואימניקים מאומתים יגישו מועמדות, ואתם בוחרים.">
      <JobForm cats={grouped} userId={me.userId} poster={poster!} />
    </PageShell>
  );
}
