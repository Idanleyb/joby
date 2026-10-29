import "server-only";
import { createClient } from "@/lib/supabase/server";

export type OnboardingStep = "/login" | "/onboarding/phone" | "/onboarding/welcome" | "/onboarding/poster" | "/account";

export type Me = {
  userId: string;
  fullName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  /** Signed in with Google: no SMS code needed (founder, 2026-10-29). */
  googleVerified: boolean;
  /** Has a number we can reach (verified phone, or the one a Google user typed). */
  hasPhone: boolean;
  termsAccepted: boolean;
  isPoster: boolean;
  isProvider: boolean;
  suspended: boolean;
  hasPosterProfile: boolean;
  isDemo: boolean;
};

/** The signed-in user and their onboarding state, or null when signed out. */
export async function getMe(): Promise<Me | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: poster }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, contact_phone, phone_verified, google_verified, terms_accepted_at, is_poster, is_provider, status, is_demo")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("poster_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    userId: user.id,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? profile?.contact_phone ?? null,
    phoneVerified: profile?.phone_verified ?? false,
    googleVerified: profile?.google_verified ?? false,
    hasPhone: Boolean(profile?.phone ?? profile?.contact_phone),
    termsAccepted: Boolean(profile?.terms_accepted_at),
    isPoster: profile?.is_poster ?? false,
    isProvider: profile?.is_provider ?? false,
    suspended: profile?.status === "suspended",
    hasPosterProfile: Boolean(poster),
    isDemo: profile?.is_demo ?? false,
  };
}

/**
 * Where the user should be right now (PRD 5.1, 5.7):
 * sign in → verified phone (SMS code; Google users only type their number) → name, roles and terms → poster details → account.
 * The provider wizard (Form 3010, CV, …) is added in the next build step.
 */
export function nextStep(me: Me | null): OnboardingStep {
  if (!me) return "/login";
  // Phone users confirm by SMS; Google users only type their number (no code).
  if (!(me.phoneVerified || (me.googleVerified && me.hasPhone))) return "/onboarding/phone";
  if (!me.termsAccepted) return "/onboarding/welcome";
  if (me.isPoster && !me.hasPosterProfile) return "/onboarding/poster";
  return "/account";
}
