"use server";

import { createClient } from "@/lib/supabase/server";

export type AdminLoginResult = { status: "error"; message: string };

/**
 * Admin sign-in with email + password.
 *
 * Deliberately different from the parent flow: parents use invite-only magic
 * links (no password to remember for a once-a-season visit), while the admin
 * signs in frequently from any device and wants a saveable credential.
 *
 * A successful password check is not enough — the account must also be
 * is_admin, otherwise the session is discarded immediately. That keeps this
 * page from becoming a second way for a parent account to authenticate.
 *
 * Errors are intentionally generic (never "no such user" / "wrong password")
 * so this page doesn't reveal which emails exist.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AdminLoginResult | void> {
  const clean = email.trim().toLowerCase();
  if (!clean || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: clean,
    password,
  });

  if (error || !data.user) {
    return { status: "error", message: "Incorrect email or password." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    await supabase.auth.signOut();
    return { status: "error", message: "Incorrect email or password." };
  }
}
