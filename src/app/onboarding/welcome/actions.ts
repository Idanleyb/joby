"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import { safeNext } from "@/lib/next-param";

export type WelcomeValues = { firstName: string; lastName: string; asProvider: boolean; asPoster: boolean; terms: boolean; marketing: boolean };
export type WelcomeState = {
  error?: string;
  fieldErrors?: Partial<Record<"firstName" | "lastName" | "roles" | "terms", string>>;
  values?: WelcomeValues; // echoed back so the form keeps what the user typed
};

export async function completeSignup(_prev: WelcomeState, form: FormData): Promise<WelcomeState> {
  const firstName = String(form.get("firstName") ?? "").trim();
  const lastName = String(form.get("lastName") ?? "").trim();
  const returning = form.get("returning") === "1";
  const asProvider = form.get("asProvider") === "on";
  const asPoster = form.get("asPoster") === "on";
  const terms = form.get("terms") === "on";
  const marketing = form.get("marketing") === "on";

  const values = { firstName, lastName, asProvider, asPoster, terms, marketing };
  const fieldErrors: WelcomeState["fieldErrors"] = {};
  if (firstName.length < 2) fieldErrors.firstName = "יש להזין שם פרטי.";
  if (lastName.length < 2) fieldErrors.lastName = "יש להזין שם משפחה.";
  const next = safeNext(String(form.get("next") ?? ""));

  // Accounts from before first/last name were separate: only the names are missing.
  if (returning) {
    if (Object.keys(fieldErrors).length) return { fieldErrors, values };
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_my_names", { p_first_name: firstName, p_last_name: lastName });
    if (error) return { error: appErrorMessage(error), values };
    revalidatePath("/", "layout");
    redirect(next ? `/onboarding?next=${encodeURIComponent(next)}` : "/onboarding");
  }
  // Invited admins may skip the roles (they can add one later).
  const adminInvite = String(form.get("next") ?? "").startsWith("/invite/admin/");
  if (!asProvider && !asPoster && !adminInvite) fieldErrors.roles = "יש לבחור לפחות אפשרות אחת.";
  if (!terms) fieldErrors.terms = "יש לאשר את תנאי השימוש ומדיניות הפרטיות.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_signup", {
    p_first_name: firstName,
    p_last_name: lastName,
    p_as_provider: asProvider,
    p_as_poster: asPoster,
    p_marketing_opt_in: marketing,
  });
  if (error) return { error: appErrorMessage(error), values };
  revalidatePath("/", "layout");
  if (next) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  redirect(asProvider && !asPoster ? "/provider/onboarding" : "/onboarding");
}
