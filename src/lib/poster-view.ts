import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PosterView = NonNullable<Awaited<ReturnType<typeof loadPosterView>>>;

/** Everything shown on a poster's public profile. */
export async function loadPosterView(userId: string) {
  const supabase = await createClient();
  const { data: p } = await supabase.from("poster_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!p) return null;
  const [jobs, reviews] = await Promise.all([
    supabase.from("jobs").select("id, is_demo, title, mode, city, budget_type, budget_min, budget_max, timeline, published_at, application_count, sub:subcategories(name_he)")
      .eq("poster_id", userId).eq("status", "open").order("published_at", { ascending: false }).limit(10),
    supabase.from("public_reviews").select("id, overall, comment, submitted_at, author_name, engagement_title, would_again").eq("subject_id", userId)
      .eq("direction", "provider_to_poster").order("submitted_at", { ascending: false }).limit(20),
  ]);
  const logoUrl = p.logo_path ? supabase.storage.from("avatars").getPublicUrl(p.logo_path).data.publicUrl : null;
  return { ...p, logoUrl, openJobs: jobs.data ?? [], reviews: reviews.data ?? [] };
}
