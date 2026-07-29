"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/url";

export type AdminLoginResult = { status: "error"; message: string };
export type ResetRequestResult = { status: "sent" | "error"; message: string };

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

/**
 * Self-service "forgot password" — deliberately separate from Supabase
 * Dashboard's built-in recovery button, which always redirects to the bare
 * Site URL with no way to point it at a specific page. This sets redirectTo
 * explicitly, same pattern as the magic-link's emailRedirectTo, so the
 * recovery link lands on /admin/reset-password instead of the apex home page.
 *
 * Always returns the same "sent" message regardless of whether the email
 * exists or is an admin, so this can't be used to enumerate accounts.
 */
export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  const clean = email.trim().toLowerCase();
  const genericSent: ResetRequestResult = {
    status: "sent",
    message: "If that email has an admin account, a reset link is on its way.",
  };
  if (!clean) {
    return { status: "error", message: "Enter your email address." };
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(clean, {
    redirectTo: `${origin}/admin/reset-password`,
  });

  return genericSent;
}
