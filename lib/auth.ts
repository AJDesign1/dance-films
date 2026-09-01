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

export type AuthUser = { id: string; email: string };

/**
 * The current auth user, or null. Still a *verified* identity, not a trusted
 * cookie: getClaims() checks the JWT's signature against the project's JWKS.
 *
 * Uses getClaims() rather than getUser() because getUser() asks the Auth server
 * over the network on every single call. Measured against this project:
 * getUser() costs 58–97ms each time, getClaims() ~1ms once the JWKS is cached
 * (the cache is shared across client instances, so a warm serverless function
 * pays it once, not per request). Middleware also validated the session, so the
 * old arrangement bought two network round trips per page load.
 *
 * The trade-off is that claims come from the token, so a user deleted or banned
 * mid-session stays valid until their access token expires. Access to data is
 * unaffected — RLS evaluates the same JWT server-side either way.
 *
 * Still wrapped in `cache()` so a layout and the page inside it share one call.
 */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
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
