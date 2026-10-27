"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function becomeProvider() {
  const supabase = await createClient();
  await supabase.rpc("start_provider_onboarding");
  revalidatePath("/account");
}
