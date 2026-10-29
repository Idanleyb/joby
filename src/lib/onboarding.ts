import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type OnboardingStep = "/login" | "/onboarding/phone" | "/onboarding/email" | "/onboarding/welcome" | "/onboarding/poster" | "/account";

export type Me = {
  userId: string;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  /** Email confirmed by code (or by Google). Required for everyone (founder, 2026-10-29). */
  emailVerified: boolean;
  phone: string | null;
  phoneVerified: boolean;
  /** Signed in with Google (the email is confirmed by Google; the phone still needs an SMS code). */
  googleVerified: boolean;
  termsAccepted: boolean;
  isPoster: boolean;
  isProvider: boolean;
  suspended: boolean;
  hasPosterProfile: boolean;
  isDemo: boolean;
};

/**
 * The signed-in auth user, checked with the auth service once per request (React cache):
 * the header, menu, banner and page all ask, but only the first call goes over the network.
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

/** The signed-in user and their onboarding state, or null when signed out. Once per request. */
export const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await createClient();
  const user = await getAuthUser();
  if (!user) return null;

  const [{ data: profile }, { data: poster }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, first_name, last_name, email, email_verified, phone, phone_verified, google_verified, terms_accepted_at, is_poster, is_provider, status, is_demo")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("poster_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    userId: user.id,
    fullName: profile?.full_name ?? null,
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? null,
    email: profile?.email ?? null,
    emailVerified: profile?.email_verified ?? false,
    phone: profile?.phone ?? null,
    phoneVerified: profile?.phone_verified ?? false,
    googleVerified: profile?.google_verified ?? false,
    termsAccepted: Boolean(profile?.terms_accepted_at),
    isPoster: profile?.is_poster ?? false,
    isProvider: profile?.is_provider ?? false,
    suspended: profile?.status === "suspended",
    hasPosterProfile: Boolean(poster),
    isDemo: profile?.is_demo ?? false,
  };
});

/**
 * Where the user should be right now (PRD 5.1, 5.7; founder 2026-10-29):
 * sign in → phone confirmed by SMS code (Google users too) → email confirmed by code (skipped when
 * Google confirmed it) → first and last name, roles and terms → poster details → account.
 * Accounts created before a step existed are sent to it the next time they use the app.
 * Demo accounts (sample data) skip the email and name checks.
 */
export function nextStep(me: Me | null): OnboardingStep {
  if (!me) return "/login";
  if (!me.phoneVerified) return "/onboarding/phone";
  if (!me.emailVerified && !me.isDemo) return "/onboarding/email";
  if (!me.termsAccepted || (!me.isDemo && (!me.firstName || !me.lastName))) return "/onboarding/welcome";
  if (me.isPoster && !me.hasPosterProfile) return "/onboarding/poster";
  return "/account";
}
