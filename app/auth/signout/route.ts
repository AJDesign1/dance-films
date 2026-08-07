import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/url";

/**
 * Sign out, then return to the right sign-in screen for where the user was:
 * parents to the school's magic-link page, the admin to its own password page.
 *
 * The target comes from the form, so it's matched against a fixed allowlist
 * rather than used as given — a redirect target from a request body is an open
 * redirect otherwise.
 */
const RETURN_TO = new Set(["/login", "/admin/login"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  let next = "/login";
  try {
    const form = await request.formData();
    const requested = form.get("next");
    if (typeof requested === "string" && RETURN_TO.has(requested)) next = requested;
  } catch {
    // No form body (or not form-encoded) — fall back to the parent login.
  }

  // Header-based origin: Netlify's runtime doesn't reliably preserve the
  // hostname in request.url, which would bounce a school subdomain to the apex.
  const origin = await getOrigin();
  return NextResponse.redirect(`${origin}${next}`, { status: 303 });
}
