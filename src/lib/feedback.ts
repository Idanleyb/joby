import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FeedbackItem = {
  engagementId: string; title: string; createdAt: string; otherId: string; otherName: string; iAmPoster: boolean;
  state: "blocked" | "warning" | "due" | "early"; requestedAt: string | null; remindersSent: number; deadline: string | null;
};

const DAY = 86_400_000;

/** Engagements where the signed-in user still owes feedback (PRD 5.14). */
export async function loadFeedbackDue(userId: string): Promise<FeedbackItem[]> {
  const supabase = await createClient();
  const [{ data: engagements }, { data: mine }, { data: requests }] = await Promise.all([
    supabase.from("engagements").select("id, title, created_at, poster_id, provider_id")
      .or(`poster_id.eq.${userId},provider_id.eq.${userId}`).is("cancelled_at", null).order("created_at", { ascending: false }),
    supabase.from("feedback").select("engagement_id").eq("author_id", userId),
    supabase.from("feedback_requests").select("engagement_id, requested_at, reminders_sent, blocked_at, completed_at").eq("user_id", userId),
  ]);
  const done = new Set((mine ?? []).map((f) => f.engagement_id));
  const open = (engagements ?? []).filter((e) => !done.has(e.id));
  if (!open.length) return [];

  const posterIds = open.filter((e) => e.provider_id === userId).map((e) => e.poster_id);
  const providerIds = open.filter((e) => e.poster_id === userId).map((e) => e.provider_id);
  const [{ data: posters }, { data: providers }] = await Promise.all([
    posterIds.length ? supabase.from("poster_profiles").select("user_id, display_name").in("user_id", posterIds) : Promise.resolve({ data: [] as { user_id: string; display_name: string }[] }),
    providerIds.length ? supabase.from("provider_profiles").select("user_id, display_name").in("user_id", providerIds) : Promise.resolve({ data: [] as { user_id: string; display_name: string | null }[] }),
  ]);
  const names = new Map([...(posters ?? []), ...(providers ?? [])].map((p) => [p.user_id, p.display_name ?? ""]));

  return open.map((e) => {
    const iAmPoster = e.poster_id === userId;
    const otherId = iAmPoster ? e.provider_id : e.poster_id;
    const r = (requests ?? []).find((x) => x.engagement_id === e.id && !x.completed_at);
    const state: FeedbackItem["state"] = !r ? "early" : r.blocked_at ? "blocked" : r.reminders_sent >= 2 ? "warning" : "due";
    return {
      engagementId: e.id, title: e.title, createdAt: e.created_at, otherId, otherName: names.get(otherId) ?? "", iAmPoster, state,
      requestedAt: r?.requested_at ?? null, remindersSent: r?.reminders_sent ?? 0,
      deadline: r ? new Date(new Date(r.requested_at).getTime() + 30 * DAY).toISOString() : null,
    };
  });
}

export const dmy = (iso: string) => new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
