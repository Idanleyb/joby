"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appErrorMessage } from "@/lib/errors";
import type { Database } from "@/lib/database.types";

type PosterType = Database["public"]["Enums"]["poster_type"];
const POSTER_TYPES: PosterType[] = ["private", "business", "hr", "public_body"];

export type PosterValues = { posterType: string; companyName: string; city: string; website: string };
export type PosterState = {
  error?: string;
  fieldErrors?: Partial<Record<"posterType" | "companyName" | "city" | "website", string>>;
  values?: PosterValues; // echoed back so the form keeps what the user typed
};

/** "Avi Mor" → "Avi M." — private posters are shown by first name and initial. */
function shortName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

export async function savePosterProfile(_prev: PosterState, form: FormData): Promise<PosterState> {
  const posterType = String(form.get("posterType") ?? "") as PosterType;
  const companyName = String(form.get("companyName") ?? "").trim();
  const city = String(form.get("city") ?? "").trim();
  let website = String(form.get("website") ?? "").trim();

  const values = { posterType, companyName, city, website: String(form.get("website") ?? "").trim() };
  const fieldErrors: PosterState["fieldErrors"] = {};
  if (!POSTER_TYPES.includes(posterType)) fieldErrors.posterType = "יש לבחור סוג מפרסם.";
  if (posterType !== "private" && companyName.length < 2) fieldErrors.companyName = "יש להזין את שם הארגון.";
  if (city.length < 2) fieldErrors.city = "יש להזין עיר.";
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try {
      new URL(website);
    } catch {
      fieldErrors.website = "כתובת האתר אינה תקינה.";
    }
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();

  const { error } = await supabase.rpc("upsert_poster_profile", {
    p_display_name: posterType === "private" ? shortName(profile?.full_name ?? "") : companyName,
    p_poster_type: posterType,
    p_city: city,
    p_company_name: posterType === "private" ? undefined : companyName,
    p_website: website || undefined,
  });
  if (error) return { error: appErrorMessage(error), values };
  redirect("/onboarding");
}
