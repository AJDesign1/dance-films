import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/url";

/**
 * token_hash verification — the alternative magic-link template
 * ({{ .TokenHash }} → /auth/confirm?token_hash=…&type=magiclink). Kept
 * alongside the PKCE callback so either Supabase email template works.
 *
 * Origin comes from getOrigin() (x-forwarded-host), not request.url — see
 * the callback route for why.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/shows";
  const origin = await getOrigin();

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
