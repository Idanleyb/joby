"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";

export type WelcomeValues = { fullName: string; asProvider: boolean; asPoster: boolean; terms: boolean; marketing: boolean };
export type WelcomeState = {
  error?: string;
  fieldErrors?: Partial<Record<"fullName" | "roles" | "terms", string>>;
  values?: WelcomeValues; // echoed back so the form keeps what the user typed
};

export async function completeSignup(_prev: WelcomeState, form: FormData): Promise<WelcomeState> {
  const fullName = String(form.get("fullName") ?? "").trim();
  const asProvider = form.get("asProvider") === "on";
  const asPoster = form.get("asPoster") === "on";
  const terms = form.get("terms") === "on";
  const marketing = form.get("marketing") === "on";

  const values = { fullName, asProvider, asPoster, terms, marketing };
  const fieldErrors: WelcomeState["fieldErrors"] = {};
  if (fullName.length < 2 || !fullName.includes(" ")) fieldErrors.fullName = "יש להזין שם פרטי ושם משפחה.";
  if (!asProvider && !asPoster) fieldErrors.roles = "יש לבחור לפחות אפשרות אחת.";
  if (!terms) fieldErrors.terms = "יש לאשר את תנאי השימוש ומדיניות הפרטיות.";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_signup", {
    p_full_name: fullName,
    p_as_provider: asProvider,
    p_as_poster: asPoster,
    p_marketing_opt_in: marketing,
  });
  if (error) return { error: appErrorMessage(error), values };
  redirect("/onboarding");
}
