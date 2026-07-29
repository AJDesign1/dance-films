import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/url";

/**
 * PKCE code exchange — the default magic-link flow with @supabase/ssr.
 * Supabase verifies the emailed link, then redirects here with ?code=…
 *
 * Origin comes from getOrigin() (x-forwarded-host), not request.url — on
 * Netlify's runtime request.url doesn't reliably reflect the subdomain the
 * request actually came in on, which sent every school's login back to the
 * apex domain instead of e.g. liberty.dancefilms.co.uk.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/shows";
  const origin = await getOrigin();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
