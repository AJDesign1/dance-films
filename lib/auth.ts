import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  is_admin: boolean;
};

/** The current auth user, or null. Always use this (not getSession) for trust. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** The current user's profile row (name, is_admin, …), or null if signed out. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
}

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
