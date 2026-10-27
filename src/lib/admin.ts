import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMe } from "@/lib/onboarding";

/** Admin or reviewer, else redirect. Every admin RPC re-checks this in the database. */
export async function requireAdmin() {
  const me = await getMe();
  if (!me) redirect("/login?next=/admin");
  const supabase = await createClient();
  const { data } = await supabase.from("admins").select("role").eq("user_id", me.userId).maybeSingle();
  if (!data) redirect("/account");
  return { me, role: data.role };
}

export function hoursSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}
