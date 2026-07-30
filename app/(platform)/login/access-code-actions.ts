"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentSchool } from "@/lib/school";
import { getOrigin } from "@/lib/url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type CodeCheckResult = { status: "valid" } | { status: "invalid" };

export type RedeemResult =
  | { status: "sent"; email: string }
  | { status: "invalid_code" }
  | { status: "error"; message: string };

function normaliseCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Step 1 of the access-code flow: validate the code against the current
 * school before asking for an email, so a bad code fails fast.
 */
export async function checkAccessCode(code: string): Promise<CodeCheckResult> {
  const school = await getCurrentSchool();
  const clean = normaliseCode(code);
  if (!school || !clean) return { status: "invalid" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("access_codes")
    .select("id, status")
    .eq("school_id", school.id)
    .eq("code", clean)
    .maybeSingle();

  return data && data.status === "active" ? { status: "valid" } : { status: "invalid" };
}

/**
 * Step 2: given a valid code + email, this is the entire onboarding —
 * everything downstream reuses the existing invite/auth machinery:
 *  - adds a row to invited_emails if one doesn't already exist (same table,
 *    same shape the admin's "Invited parents" screen already writes to —
 *    the whole point of a code is the user needn't already be on this list)
 *  - sends a magic link via the same signInWithOtp the normal flow uses
 * From the next click onward they're just a normal invited user — nothing
 * about the account itself is code-specific after this point.
 */
export async function redeemAccessCode(code: string, email: string): Promise<RedeemResult> {
  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const school = await getCurrentSchool();
  if (!school) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  const admin = createAdminClient();
  const cleanCode = normaliseCode(code);
  const { data: accessCode } = await admin
    .from("access_codes")
    .select("id, status, show_id")
    .eq("school_id", school.id)
    .eq("code", cleanCode)
    .maybeSingle();

  if (!accessCode || accessCode.status !== "active") {
    return { status: "invalid_code" };
  }

  const { data: existingInvite } = await admin
    .from("invited_emails")
    .select("id")
    .eq("school_id", school.id)
    .ilike("email", clean)
    .maybeSingle();

  if (!existingInvite) {
    await admin.from("invited_emails").insert({ school_id: school.id, email: clean });
  }

  // If the code is tied to a specific show, land them there after signing in.
  let next = "/shows";
  if (accessCode.show_id) {
    const { data: show } = await admin
      .from("shows")
      .select("slug")
      .eq("id", accessCode.show_id)
      .maybeSingle();
    if (show) next = `/show/${show.slug}`;
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: clean,
    options: { emailRedirectTo: `${origin}/auth/callback?next=${next}` },
  });

  if (error) return { status: "error", message: error.message };
  return { status: "sent", email: clean };
}
