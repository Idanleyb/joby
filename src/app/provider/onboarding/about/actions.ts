"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { advanceFrom } from "../actions";

export type AboutValues = { headline: string; bio: string; years: string; languages: string[]; portfolio: string };
export type AboutState = { error?: string; fieldErrors?: Partial<Record<keyof AboutValues, string>>; values?: AboutValues };

export async function saveAbout(_prev: AboutState, form: FormData): Promise<AboutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const values: AboutValues = {
    headline: String(form.get("headline") ?? "").trim(),
    bio: String(form.get("bio") ?? "").trim(),
    years: String(form.get("years") ?? "").trim(),
    languages: form.getAll("languages").map(String),
    portfolio: String(form.get("portfolio") ?? "").trim(),
  };
  const fe: AboutState["fieldErrors"] = {};
  if (values.headline.length < 5 || values.headline.length > 70) fe.headline = "כותרת של 5 עד 70 תווים.";
  if (values.bio.length < 30 || values.bio.length > 1000) fe.bio = "כתבו לפחות 30 תווים (עד 1,000).";
  if (!/^\d{1,2}$/.test(values.years)) fe.years = "מספר שנים (0–60).";
  const links = values.portfolio.split(/\s+/).filter(Boolean).map((l) => (/^https?:\/\//i.test(l) ? l : `https://${l}`));
  if (links.length > 5) fe.portfolio = "עד 5 קישורים.";
  else if (links.some((l) => { try { new URL(l); return l.length > 300; } catch { return true; } })) fe.portfolio = "אחד הקישורים אינו תקין.";
  if (Object.keys(fe).length) return { fieldErrors: fe, values };

  await supabase
    .from("provider_profiles")
    .update({
      headline: values.headline,
      bio: values.bio,
      years_experience: Number(values.years),
      languages: values.languages.slice(0, 10),
      portfolio_links: links,
    })
    .eq("user_id", user.id);
  await advanceFrom(5);
  return {};
}
