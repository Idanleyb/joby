"use server";

import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import { emailCodeEmail, mailConfigured, sendMail } from "@/lib/mail";

/** Creates a 6-digit code (stored hashed) and emails it. The code never reaches the browser. */
export async function sendEmailCode(rawEmail: string): Promise<{ error?: string; email?: string }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "כתובת המייל אינה תקינה." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: appErrorMessage({ message: "not_signed_in" }) };
  if (!mailConfigured()) return { error: "שליחת מיילים עדיין לא מוגדרת במערכת. פנו לתמיכה." };
  const { data: code, error } = await createServiceClient().rpc("issue_email_code", { p_user: user.id, p_email: email });
  if (error || !code) return { error: appErrorMessage(error) };
  const sent = await sendMail({ to: email, ...emailCodeEmail(code) });
  if (!sent) return { error: "לא הצלחנו לשלוח את המייל. בדקו את הכתובת ונסו שוב." };
  return { email };
}

export async function confirmEmailCode(code: string): Promise<{ error?: string; ok?: boolean }> {
  if (!/^\d{6}$/.test(code.trim())) return { error: "הקוד כולל 6 ספרות." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_email_code", { p_code: code.trim() });
  if (error) return { error: appErrorMessage(error) };
  if (!data) return { error: "הקוד שגוי. נסו שוב או בקשו קוד חדש." };
  revalidatePath("/", "layout");
  return { ok: true };
}
