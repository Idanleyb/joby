"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { IMPERSONATION_COOKIE, parseImpersonation } from "@/lib/impersonation-cookie";

/** Ends "sign in as this user": closes the log entry, signs out, back to the sign-in page. */
export async function endImpersonation() {
  const jar = await cookies();
  const imp = parseImpersonation(jar.get(IMPERSONATION_COOKIE)?.value);
  if (imp) await createServiceClient().rpc("end_impersonation", { p_id: imp.id });
  await (await createClient()).auth.signOut({ scope: "local" });
  jar.delete(IMPERSONATION_COOKIE);
  redirect("/login?reason=impersonation_ended");
}
