"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { aiAvailable, aiErrorCode, AiError } from "@/lib/ai/client";
import { readCv, type CvReading } from "@/lib/ai/cv";
import { advanceFrom } from "../actions";

async function ctx() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export type CvRead = { ok: true; reading: CvReading; subNames: Record<string, string> } | { ok: false; reason: "ai_unavailable" | "ai_failed"; code: string };

/** Reads an uploaded CV and returns a profile suggestion. Nothing is saved yet. */
export async function readUploadedCv(path: string): Promise<CvRead> {
  const { supabase, userId } = await ctx();
  if (!path.startsWith(`${userId}/`) || path.includes("..")) return { ok: false, reason: "ai_failed", code: "AI-PATH" };
  await supabase.from("provider_profiles").update({ cv_path: path }).eq("user_id", userId);
  if (!aiAvailable()) return { ok: false, reason: "ai_unavailable", code: "AI-NOKEY" };
  try {
    const { data: subs } = await supabase.from("subcategories").select("slug, name_he").eq("active", true);
    const { data: file, error } = await createServiceClient().storage.from("cvs").download(path);
    if (error || !file) throw new AiError("AI-DL", error?.message);
    const reading = await readCv(
      { bytes: Buffer.from(await file.arrayBuffer()), mediaType: file.type, name: path.split("/").pop()! },
      (subs ?? []).map((s) => s.slug),
    );
    return { ok: true, reading, subNames: Object.fromEntries((subs ?? []).map((s) => [s.slug, s.name_he])) };
  } catch (e) {
    const code = aiErrorCode(e);
    console.error("readUploadedCv failed", code, e);
    return { ok: false, reason: "ai_failed", code };
  }
}

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
const int = (v: FormDataEntryValue | null) => (/^\d{1,4}$/.test(String(v ?? "")) ? Number(v) : null);
const yearDate = (y: number | null) => (y ? `${y}-01-01` : null);

/** Saves the reviewed suggestion. Fills empty fields only, unless "replace" is ticked. */
export async function saveCvReview(form: FormData) {
  const { supabase, userId } = await ctx();
  const replace = form.get("replace") === "on";
  const { data: p } = await supabase.from("provider_profiles").select("headline, bio, years_experience, languages").eq("user_id", userId).single();

  const headline = String(form.get("headline") ?? "").trim().slice(0, 70);
  const bio = String(form.get("bio") ?? "").trim().slice(0, 1000);
  const years = int(form.get("years"));
  const languages = lines(form.get("languages")).slice(0, 8);
  await supabase
    .from("provider_profiles")
    .update({
      headline: replace || !p?.headline ? headline || p?.headline : p.headline,
      bio: replace || !p?.bio ? bio || p?.bio : p.bio,
      years_experience: replace || p?.years_experience == null ? years ?? p?.years_experience : p.years_experience,
      languages: replace || !p?.languages?.length ? languages : p.languages,
      cv_visible: form.get("cvVisible") === "on",
    })
    .eq("user_id", userId);

  // Skills: add new ones up to the limit (15).
  const { data: existingSkills } = await supabase.from("provider_skills").select("skill").eq("provider_id", userId);
  const have = new Set((existingSkills ?? []).map((s) => s.skill));
  for (const skill of lines(form.get("skills")).map((s) => s.slice(0, 40))) {
    if (have.size >= 15) break;
    if (have.has(skill)) continue;
    const { error } = await supabase.from("provider_skills").insert({ provider_id: userId, skill });
    if (!error) have.add(skill);
  }

  // Suggested subcategories: only when none chosen yet (or replacing).
  const chosen = form.getAll("sub").map(String);
  if (chosen.length) {
    const { count } = await supabase.from("provider_subcategories").select("*", { count: "exact", head: true }).eq("provider_id", userId);
    if (replace || !count) {
      const { data: rows } = await supabase.from("subcategories").select("id, slug").in("slug", chosen);
      await supabase.from("provider_subcategories").delete().eq("provider_id", userId);
      if (rows?.length) await supabase.from("provider_subcategories").insert(rows.map((r) => ({ provider_id: userId, subcategory_id: r.id })));
    }
  }

  // Experience and education rows.
  const exp = form.getAll("expTitle").map((t, i) => ({
    title: String(t).trim().slice(0, 100),
    organization: String(form.getAll("expOrg")[i] ?? "").trim().slice(0, 100) || null,
    start_date: yearDate(int(form.getAll("expStart")[i])),
    end_date: yearDate(int(form.getAll("expEnd")[i])),
    sort_order: i,
  })).filter((e) => e.title);
  const edu = form.getAll("eduDegree").map((d, i) => ({
    degree: String(d).trim().slice(0, 100),
    institution: String(form.getAll("eduInst")[i] ?? "").trim().slice(0, 100) || null,
    end_date: yearDate(int(form.getAll("eduEnd")[i])),
    sort_order: i,
  })).filter((e) => e.degree);
  const [{ count: expCount }, { count: eduCount }] = await Promise.all([
    supabase.from("provider_experience").select("*", { count: "exact", head: true }).eq("provider_id", userId),
    supabase.from("provider_education").select("*", { count: "exact", head: true }).eq("provider_id", userId),
  ]);
  if (exp.length && (replace || !expCount)) {
    await supabase.from("provider_experience").delete().eq("provider_id", userId);
    await supabase.from("provider_experience").insert(exp.map((e) => ({ ...e, provider_id: userId })));
  }
  if (edu.length && (replace || !eduCount)) {
    await supabase.from("provider_education").delete().eq("provider_id", userId);
    await supabase.from("provider_education").insert(edu.map((e) => ({ ...e, provider_id: userId })));
  }
  await advanceFrom(2);
}

export async function setCvVisible(visible: boolean) {
  const { supabase, userId } = await ctx();
  await supabase.from("provider_profiles").update({ cv_visible: visible }).eq("user_id", userId);
}

export async function skipCv() {
  await advanceFrom(2);
}
