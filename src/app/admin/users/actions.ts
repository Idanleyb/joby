"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import { IMPERSONATION_COOKIE, IMPERSONATION_MINUTES } from "@/lib/impersonation-cookie";
import { LAST_ACTIVE_COOKIE } from "@/lib/idle";

export type EditState = { error?: string; ok?: boolean };

/** Fix an account's details (admin only; every change audited with the reason). */
export async function updateUser(userId: string, _prev: EditState, form: FormData): Promise<EditState> {
  const reason = String(form.get("reason") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_user", {
    p_user: userId,
    p_first_name: String(form.get("first_name") ?? ""),
    p_last_name: String(form.get("last_name") ?? ""),
    p_email: String(form.get("email") ?? "") || null,
    p_city: String(form.get("city") ?? "") || null,
    p_is_poster: form.get("is_poster") === "on",
    p_reason: reason,
  });
  if (error) return { error: appErrorMessage(error) };

  // The phone is the sign-in number: changed through the auth service, confirmed by the admin.
  const phone = String(form.get("phone") ?? "").trim();
  const current = String(form.get("current_phone") ?? "").trim();
  if (phone && phone !== current) {
    const { data: e164, error: phoneError } = await supabase.rpc("admin_check_phone_change", { p_user: userId, p_phone: phone, p_reason: reason });
    if (phoneError || !e164) return { error: appErrorMessage(phoneError) };
    const { error: authError } = await createServiceClient().auth.admin.updateUserById(userId, { phone: e164.replace("+", ""), phone_confirm: true });
    if (authError) return { error: "הפרטים נשמרו, אבל הטלפון לא עודכן: " + authError.message };
  }
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function setStatus(userId: string, status: "active" | "suspended", reason: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_account_status", { p_user: userId, p_status: status, p_reason: reason });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath(`/admin/users/${userId}`);
  return {};
}

export async function adjustCredits(userId: string, amount: number, reason: string): Promise<{ error?: string }> {
  if (!Number.isInteger(amount) || amount === 0) return { error: "יש להזין מספר שלם, חיובי או שלילי." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_adjust_credits", { p_provider: userId, p_amount: amount, p_reason: reason });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath(`/admin/users/${userId}`);
  return {};
}

/**
 * "Sign in as this user" (admins only). The database checks and logs it first; then the server
 * replaces the admin's session with the user's for 30 minutes. Nothing is sent to the user.
 * Accounts without an email in the auth service get a placeholder sign-in address
 * (u-<id>@impersonate.joby.invalid) that is never shown or copied to the profile.
 */
export async function signInAsUser(userId: string, reason: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: logId, error } = await supabase.rpc("admin_start_impersonation", { p_user: userId, p_reason: reason });
  if (error || !logId) return { error: appErrorMessage(error) };

  const admin = createServiceClient();
  const { data: found } = await admin.auth.admin.getUserById(userId);
  if (!found.user) return { error: "המשתמש לא נמצא." };
  let email = found.user.email;
  if (!email) {
    email = `u-${userId}@impersonate.joby.invalid`;
    const { error: e } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (e) return { error: "לא ניתן להיכנס לחשבון: " + e.message };
  }
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const token = link?.properties?.hashed_token;
  if (linkError || !token) return { error: "לא ניתן להיכנס לחשבון כרגע." };

  await supabase.auth.signOut({ scope: "local" });
  const { error: verifyError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: token });
  if (verifyError) return { error: "הכניסה לחשבון נכשלה. היכנסו שוב לחשבון שלכם ונסו שוב." };

  const expires = Date.now() + IMPERSONATION_MINUTES * 60_000;
  const jar = await cookies();
  jar.set(IMPERSONATION_COOKIE, `${logId}.${expires}`, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: IMPERSONATION_MINUTES * 60 });
  jar.set(LAST_ACTIVE_COOKIE, String(Date.now()), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return {};
}
