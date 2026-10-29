"use server";

import { createClient } from "@/lib/supabase/server";
import { demoSignInToken } from "@/lib/demo-login";

/** Signs in to a demo account (see src/lib/demo-login.ts). */
export async function signInAsDemo(key: string): Promise<{ error?: string }> {
  const token = await demoSignInToken(key);
  if (!token) return { error: "חשבון הדמו אינו זמין כרגע." };
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: token });
  if (error) return { error: "הכניסה לחשבון הדמו נכשלה. נסו שוב." };
  return {};
}
