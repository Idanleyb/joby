"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markAllRead() {
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read", {});
  revalidatePath("/", "layout");
}

export async function markRead(id: number) {
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read", { p_ids: [id] });
  revalidatePath("/", "layout");
}

/** Unread in-app notifications, for the menu badge (refreshed on every page change). */
export async function unreadCount(): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("in_app", true).is("read_at", null);
  return count ?? 0;
}
