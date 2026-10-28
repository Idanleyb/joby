import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ProviderView = Awaited<ReturnType<typeof loadProviderView>>;

/** Everything shown on a provider profile. Row-level security decides visibility. */
export async function loadProviderView(userId: string) {
  const supabase = await createClient();
  const { data: p } = await supabase.from("provider_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (!p) return null;
  const [subs, skills, services, exp, edu, reviews] = await Promise.all([
    supabase.from("provider_subcategories").select("subcategories(name_he, licensed)").eq("provider_id", userId),
    supabase.from("provider_skills").select("skill").eq("provider_id", userId),
    supabase.from("service_cards").select("id, title, description, price_from, unit, mode, subcategories(name_he)").eq("provider_id", userId).order("created_at"),
    supabase.from("provider_experience").select("title, organization, start_date, end_date").eq("provider_id", userId).order("sort_order"),
    supabase.from("provider_education").select("degree, institution, end_date").eq("provider_id", userId).order("sort_order"),
    supabase.from("public_reviews").select("id, overall, comment, submitted_at, author_name, engagement_title, would_again").eq("subject_id", userId)
      .eq("direction", "poster_to_provider").order("submitted_at", { ascending: false }).limit(20),
  ]);
  const gallery = (p.gallery_paths ?? []).map((path) => ({ path, url: supabase.storage.from("portfolio").getPublicUrl(path).data.publicUrl }));
  const photoUrl = p.photo_path ? supabase.storage.from("avatars").getPublicUrl(p.photo_path).data.publicUrl : null;
  return {
    ...p,
    photoUrl,
    subcategories: (subs.data ?? []).map((s) => s.subcategories?.name_he).filter((s): s is string => Boolean(s)),
    hasLicensed: (subs.data ?? []).some((s) => s.subcategories?.licensed),
    skills: (skills.data ?? []).map((s) => s.skill),
    services: (services.data ?? []).map((s) => ({ ...s, sub: s.subcategories?.name_he ?? "" })),
    experience: exp.data ?? [],
    education: edu.data ?? [],
    reviews: reviews.data ?? [],
    gallery,
    busyNow: p.availability === "busy" && (!p.busy_until || p.busy_until >= new Date().toISOString().slice(0, 10)),
  };
}
