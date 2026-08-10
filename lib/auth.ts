import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
};

/**
 * The current auth user, or null. Always use this (not getSession) for trust —
 * it validates the token with Supabase rather than trusting the cookie.
 *
 * That validation is a network round trip, so it's wrapped in `cache()`: a
 * layout and the page inside it (or a page and a helper) asking for the user
 * now share one call per request instead of paying for it each time.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The current user's profile row (name, is_admin, …), or null if signed out.
 * Also request-cached, and goes through getUser() rather than re-validating the
 * token itself, so callers that need both don't trigger two auth round trips.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
});

/**
 * Gate for customer pages: must be signed in AND onboarded (name captured).
 * Redirects to /login when signed out, or /welcome when the name is still
 * missing (first sign-in). Returns the profile otherwise.
 */
export async function requireOnboardedProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.name || profile.name.trim() === "") redirect("/welcome");
  return profile;
}
