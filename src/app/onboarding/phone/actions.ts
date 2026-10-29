"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import { normalizeIlPhone } from "@/lib/phone";
import { safeNext } from "@/lib/next-param";

export type ContactPhoneState = { error?: string; phone?: string };

/** Google users: mobile number without an SMS code (founder decision 2026-10-29). */
export async function saveContactPhone(_prev: ContactPhoneState, form: FormData): Promise<ContactPhoneState> {
  const raw = String(form.get("phone") ?? "").trim();
  const phone = normalizeIlPhone(raw);
  if (!phone) return { error: "יש להזין מספר נייד ישראלי, למשל 050-1234567.", phone: raw };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_contact_phone", { p_phone: phone });
  if (error) return { error: appErrorMessage(error), phone: raw };
  const next = safeNext(String(form.get("next") ?? ""));
  revalidatePath("/", "layout");
  redirect(next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding");
}
