"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

type R = { error?: string; ok?: boolean };

async function uid() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveAvailability(_prev: R, form: FormData): Promise<R> {
  const { supabase, user } = await uid();
  if (!user) return { error: "יש להתחבר מחדש." };
  const availability = form.get("availability") === "busy" ? "busy" : "available";
  const until = String(form.get("busyUntil") ?? "") || null;
  if (until && until < new Date().toISOString().slice(0, 10)) return { error: "התאריך כבר עבר." };
  const { error } = await supabase.from("provider_profiles")
    .update({ availability, busy_until: availability === "busy" ? until : null }).eq("user_id", user.id);
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/profile");
  return { ok: true };
}

export async function saveGallery(paths: string[]): Promise<R> {
  const { supabase, user } = await uid();
  if (!user) return { error: "יש להתחבר מחדש." };
  const clean = paths.filter((p) => p.startsWith(`${user.id}/`) && !p.includes("..")).slice(0, 6);
  const { error } = await supabase.from("provider_profiles").update({ gallery_paths: clean }).eq("user_id", user.id);
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/profile");
  revalidatePath(`/providers/${user.id}`);
  return { ok: true };
}

export type PosterEditState = { error?: string; ok?: boolean };

const shortName = (full: string) => {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
};

export async function savePosterDetails(_prev: PosterEditState, form: FormData): Promise<PosterEditState> {
  const { supabase, user } = await uid();
  if (!user) return { error: "יש להתחבר מחדש." };
  const { data: current } = await supabase.from("poster_profiles").select("poster_type, logo_path").eq("user_id", user.id).single();
  if (!current) return { error: "לא נמצא פרופיל מפרסם." };
  const companyName = String(form.get("companyName") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  const about = String(form.get("about") ?? "").trim().slice(0, 500);
  const logo = String(form.get("logo") ?? "");
  let website = String(form.get("website") ?? "").trim();
  if (current.poster_type !== "private" && companyName.length < 2) return { error: "יש להזין את שם הארגון." };
  if (city.length < 2) return { error: "יש להזין עיר." };
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try { new URL(website); } catch { return { error: "כתובת האתר אינה תקינה." }; }
  }
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const { error } = await supabase.rpc("upsert_poster_profile", {
    p_display_name: current.poster_type === "private" ? shortName(profile?.full_name ?? "") : companyName,
    p_poster_type: current.poster_type,
    p_city: city,
    p_company_name: current.poster_type === "private" ? undefined : companyName,
    p_website: website || undefined,
    p_logo_path: logo.startsWith(`${user.id}/`) ? logo : undefined,
  });
  if (error) return { error: appErrorMessage(error) };
  const { error: e2 } = await supabase.from("poster_profiles").update({ about: about || null }).eq("user_id", user.id);
  if (e2) return { error: appErrorMessage(e2) };
  revalidatePath("/profile");
  revalidatePath(`/posters/${user.id}`);
  return { ok: true };
}
