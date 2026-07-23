import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SCHOOL_SLUG_HEADER, schoolSlugFromHost } from "@/lib/tenant";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Runs on every request:
 *  1. Resolves the tenant (school) from the subdomain and forwards it to the
 *     app via a request header, so server components can theme per school.
 *  2. Refreshes the Supabase auth session cookie (required for SSR auth).
 */
export async function middleware(request: NextRequest) {
  const slug = schoolSlugFromHost(
    request.headers.get("host"),
    request.nextUrl.searchParams,
  );

  // Forward the resolved slug to the app on the request headers.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SCHOOL_SLUG_HEADER, slug);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // Keep the Supabase session fresh (writes refreshed auth cookies onto the response).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on everything except static assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
