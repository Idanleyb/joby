"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

/** Removes every demo account and everything attached to it (admin only, audited). */
export async function purgeDemo(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_purge_demo");
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/", "layout");
  return {};
}
