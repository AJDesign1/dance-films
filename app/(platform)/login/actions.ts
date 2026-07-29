"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentSchool } from "@/lib/school";
import { getOrigin } from "@/lib/url";

const ADMIN_EMAIL = "ajdesign@hotmail.co.uk";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginResult =
  | { status: "sent"; email: string }
  | { status: "not_invited"; email: string }
  | { status: "error"; message: string };

/**
 * Invite-only magic link. The allowlist is checked server-side with the service
 * role (invited_emails is never client-readable) BEFORE any OTP is requested —
 * a non-invited email gets the polite refusal and no link is ever sent.
 */
export async function requestMagicLink(email: string): Promise<LoginResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const isPlatformAdmin = clean === ADMIN_EMAIL;
  const school = await getCurrentSchool();

  // No school resolved (e.g. signing in from the apex /admin) is only valid
  // for the platform admin — everyone else needs a school context to check
  // against its invite list.
  if (!school && !isPlatformAdmin) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  if (!isPlatformAdmin) {
    // Allowlist check (service role — bypasses RLS on invited_emails).
    const admin = createAdminClient();
    const { data: invite } = await admin
      .from("invited_emails")
      .select("id")
      .eq("school_id", school!.id)
      .ilike("email", clean)
      .maybeSingle();

    if (!invite) {
      return { status: "not_invited", email: clean };
    }
  }

  // Invited (or platform admin) → send the magic link.
  const origin = await getOrigin();
  const next = school ? "/shows" : "/admin";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${next}` },
  });

  if (error) {
    return { status: "error", message: error.message };
  }
  return { status: "sent", email: clean };
}
