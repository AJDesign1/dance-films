import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/url";
import { safeAuthNext } from "@/lib/auth-redirect";

/**
 * Consumes the token only after the user submits the intermediate confirmation
 * page. This keeps mail-provider link scanners from using a one-time token
 * before the recipient can click it.
 *
 * Origin comes from getOrigin() (x-forwarded-host), not request.url — see
 * the callback route for why.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeAuthNext(searchParams.get("next"));
  const origin = await getOrigin();

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
