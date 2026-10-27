"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { advanceFrom } from "../actions";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function setPhoto(path: string) {
  const { supabase, userId } = await ctx();
  if (!path.startsWith(`${userId}/`) || path.includes("..")) return;
  const { data: old } = await supabase.from("provider_profiles").select("photo_path").eq("user_id", userId).single();
  await supabase.from("provider_profiles").update({ photo_path: path }).eq("user_id", userId);
  if (old?.photo_path && old.photo_path !== path) await supabase.storage.from("avatars").remove([old.photo_path]);
  revalidatePath("/provider/onboarding/photo");
}

export async function setShowDaysBand(show: boolean) {
  const { supabase, userId } = await ctx();
  await supabase.from("provider_profiles").update({ show_days_band: show }).eq("user_id", userId);
  revalidatePath("/provider/onboarding/photo");
}

export async function finishProfile() {
  await advanceFrom(7);
}
