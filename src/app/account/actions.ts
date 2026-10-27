"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import { normalizeIlPhone } from "@/lib/phone";

export async function becomeProvider() {
  const supabase = await createClient();
  await supabase.rpc("start_provider_onboarding");
  revalidatePath("/", "layout");
  redirect("/provider/onboarding");
}

export type InviteState = { error?: string };

export async function inviteSpouse(_prev: InviteState, form: FormData): Promise<InviteState> {
  const name = String(form.get("name") ?? "").trim();
  const phone = normalizeIlPhone(String(form.get("phone") ?? ""));
  if (name.length < 2) return { error: "יש להזין שם." };
  if (!phone) return { error: "יש להזין מספר נייד ישראלי." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_spouse", { p_name: name, p_phone: phone });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/account");
  return {};
}

export async function cancelSpouseInvite(linkId: string) {
  const supabase = await createClient();
  await supabase.rpc("cancel_spouse_invite", { p_link: linkId });
  revalidatePath("/account");
}

export async function saveNotificationPrefs(prefs: { job_alerts: "instant" | "off"; whatsapp: boolean; email_digest: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ notification_prefs: prefs }).eq("id", user.id);
  revalidatePath("/account");
}
