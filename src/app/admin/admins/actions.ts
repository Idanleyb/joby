"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import { adminInviteEmail, sendMail } from "@/lib/mail";

export type InviteState = {
  error?: string;
  sent?: { name: string; email: string; link: string; emailed: boolean; existingUser: boolean };
  values?: { name: string; email: string; role: string; message: string };
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Creates the invitation in the database, then emails the Hebrew invitation. */
export async function inviteAdmin(_prev: InviteState, form: FormData): Promise<InviteState> {
  const values = {
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim(),
    role: form.get("role") === "reviewer" ? "reviewer" : "admin",
    message: String(form.get("message") ?? "").slice(0, 1000),
  };
  if (values.name.length < 2) return { error: "יש להזין שם.", values };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) return { error: "כתובת המייל אינה תקינה.", values };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_invite", {
    p_email: values.email, p_full_name: values.name, p_role: values.role as "admin" | "reviewer",
  });
  const row = data?.[0];
  if (error || !row) return { error: appErrorMessage(error), values };

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = user ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : { data: null };
  const link = `${siteUrl()}/invite/admin/${row.token}`;
  const emailed = await sendMail({
    to: values.email,
    ...adminInviteEmail({ name: values.name, link, message: values.message, inviter: me?.full_name }),
  });
  revalidatePath("/admin/admins");
  return { sent: { name: values.name, email: values.email.toLowerCase(), link, emailed, existingUser: row.existing_user } };
}

export async function revokeInvite(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_invite", { p_invite: id });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/admin/admins");
  return {};
}

export async function removeAdmin(userId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_remove_admin", { p_user: userId });
  if (error) return { error: appErrorMessage(error) };
  revalidatePath("/admin/admins");
  return {};
}
