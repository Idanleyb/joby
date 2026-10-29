import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/onboarding";

/** "admin" | "reviewer" | null for that user, looked up once per request. */
export const getAdminRole = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("admins").select("role").eq("user_id", userId).maybeSingle();
  return data?.role ?? null;
});

/** Admin or reviewer, else redirect. Every admin RPC re-checks this in the database. */
export async function requireAdmin() {
  const me = await getMe();
  if (!me) redirect("/login?next=/admin");
  const role = await getAdminRole(me.userId);
  if (!role) redirect("/account");
  return { me, role };
}

export function hoursSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}
