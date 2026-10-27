"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import { advanceFrom } from "../actions";

export type CatState = { error?: string; values?: { subs: number[]; skills: string; license: string; otherTitle: string } };

export async function saveCategories(_prev: CatState, form: FormData): Promise<CatState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const subs = [...new Set(form.getAll("sub").map(Number).filter(Number.isInteger))];
  const skillsRaw = String(form.get("skills") ?? "");
  const license = String(form.get("license") ?? "").trim().slice(0, 40);
  const otherTitle = String(form.get("otherTitle") ?? "").trim().slice(0, 60);
  const values = { subs, skills: skillsRaw, license, otherTitle };

  if (subs.length < 1) return { error: "יש לבחור לפחות תחום אחד.", values };
  const { data: chosen } = await supabase.from("subcategories").select("id, licensed, is_other").in("id", subs);
  if (chosen?.some((s) => s.licensed) && !license) return { error: "במקצוע הדורש רישיון יש להזין מספר רישיון.", values };
  if (chosen?.some((s) => s.is_other) && otherTitle.length < 2) return { error: "בחרתם \"אחר\" — כתבו מה אתם עושים.", values };
  const skills = [...new Set(skillsRaw.split(/[,\n]/).map((s) => s.trim().slice(0, 40)).filter(Boolean))];
  if (skills.length > 15) return { error: "אפשר עד 15 מיומנויות.", values };

  await supabase.from("provider_subcategories").delete().eq("provider_id", user.id);
  const { error } = await supabase.from("provider_subcategories").insert(subs.map((id) => ({ provider_id: user.id, subcategory_id: id })));
  if (error) return { error: appErrorMessage(error), values };
  await supabase.from("provider_skills").delete().eq("provider_id", user.id);
  if (skills.length) await supabase.from("provider_skills").insert(skills.map((skill) => ({ provider_id: user.id, skill })));
  await supabase
    .from("provider_profiles")
    .update({ license_number: chosen?.some((s) => s.licensed) ? license : null, other_title: chosen?.some((s) => s.is_other) ? otherTitle : null })
    .eq("user_id", user.id);
  await advanceFrom(3);
  return {};
}

export async function suggestCategory(text: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("suggest_category", { p_text: text.trim().slice(0, 120), p_context: "onboarding" });
  return { ok: !error };
}
