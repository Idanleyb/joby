import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Numeric rules shown on public pages (How it works, Terms). Defaults match the seeded app_settings. */
export const PUBLIC_RULE_DEFAULTS = {
  welcome_credits: 100,
  apply_cost: 10,
  request_cost: 2,
  credit_back_unopened_days: 30,
  job_open_days: 30,
  job_extension_days: 30,
  request_expiry_days: 7,
  eligibility_min_days: 30,
  job_applicant_cap: 30,
  max_open_jobs_per_poster: 10,
  spouse_invite_days: 14,
  feedback_request_after_days: 3,
  feedback_reveal_days: 14,
  score_min_reviews: 3,
  hire_reversal_hours: 48,
};

export type PublicRules = typeof PUBLIC_RULE_DEFAULTS;

/** Reads the live values from app_settings, so public pages never disagree with the rules. Falls back to defaults. */
export const getPublicRules = cache(async (): Promise<PublicRules> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("key, value").in("key", Object.keys(PUBLIC_RULE_DEFAULTS));
    const out = { ...PUBLIC_RULE_DEFAULTS };
    for (const r of data ?? []) {
      const n = Number(r.value);
      if (Number.isFinite(n)) (out as Record<string, number>)[r.key] = n;
    }
    return out;
  } catch {
    return PUBLIC_RULE_DEFAULTS;
  }
});
