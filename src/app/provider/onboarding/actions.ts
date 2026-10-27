"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WIZARD_STEPS, stepPath } from "@/lib/provider";

/** Marks a wizard step done and moves to the next one (or the account page after the last). */
export async function advanceFrom(stepNumber: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabase.from("provider_profiles").select("onboarding_step").eq("user_id", user.id).single();
  const nextN = Math.min(8, stepNumber + 1);
  if ((p?.onboarding_step ?? 1) < nextN) {
    await supabase.from("provider_profiles").update({ onboarding_step: nextN }).eq("user_id", user.id);
  }
  const next = WIZARD_STEPS.find((s) => s.n === stepNumber + 1);
  redirect(next ? stepPath(next.slug) : "/account?profile=done");
}
