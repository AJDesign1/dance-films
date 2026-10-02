import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SCHOOL_SLUG_HEADER, schoolSlugFromHost } from "@/lib/tenant";
import { sharedCookieDomain } from "@/lib/cookieDomain";

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
  requestHeaders.set(SCHOOL_SLUG_HEADER, slug ?? "");

  // No tenant resolved (apex domain, Netlify default domain, unknown host):
  // serve the placeholder instead of any school's platform. Admin, auth, and
  // API routes don't depend on subdomain tenancy, so leave them alone.
  const { pathname } = request.nextUrl;
  const isTenantIndependent =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/coming-soon") ||
    pathname === "/login";

  if (!slug && !isTenantIndependent) {
    const url = request.nextUrl.clone();
    url.pathname = "/coming-soon";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  const domain = sharedCookieDomain(request.headers.get("host"));

  // Only refresh the session when there is one to refresh. Sessions live
  // entirely in `sb-*` cookies, so a signed-out visitor has nothing to validate
  // and auth.getUser() would be a guaranteed-null network round trip to
  // Supabase — paid on every request, including /login, which is the first page
  // most parents ever load.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  // Signed-out '/' and '/login' rewrite to the per-school prerendered sign-in
  // page, which the CDN serves without waking a function — cold boots measured
  // 3–7s, and this is the first page every parent loads. The cookie check only
  // picks a destination; the shared cache entry holds public branding alone,
  // and sign-in POSTs always bypass the cache. Signed-out means no sb-*
  // cookies, so skipping the session-refresh and stale-cookie blocks below
  // loses nothing.
  if (slug && !hasAuthCookie && (pathname === "/" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = `/entry/${slug}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // A signed-in visit to '/' serves the shop in this same request rather than
  // redirecting (a poster QR code usually points at '/', and a redirect makes
  // that first visit pay for a second request). The cookie only picks the
  // destination; /shows still verifies actual access.
  const entryUrl = slug && pathname === "/" ? request.nextUrl.clone() : null;
  if (entryUrl) entryUrl.pathname = "/shows";
  const makeResponse = () => entryUrl
    ? NextResponse.rewrite(entryUrl, { request: { headers: requestHeaders } })
    : NextResponse.next({ request: { headers: requestHeaders } });
  let response = makeResponse();

  if (hasAuthCookie) {
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
            requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
            response = makeResponse();
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, { ...options, domain }),
            );
          },
        },
      },
    );

    // Verify locally first. getClaims() checks the JWT against the cached JWKS
    // (~1ms once warm); getUser() is a network round trip to the Auth server
    // (58–97ms measured) on every request. The network call is only actually
    // needed when the access token is no longer valid — that's when the
    // refresh token has to be exchanged and fresh cookies written, which is
    // this block's real job. A still-valid session now costs nothing.
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) {
      await supabase.auth.getUser();
    }
  }

  // Clear any pre-existing host-only cookie of the same name — set before
  // cross-subdomain sharing existed — that would otherwise sit alongside the
  // new Domain=.dancefilms.co.uk cookie and can get sent as a stale
  // duplicate, breaking session recognition unpredictably (see DECISIONS.md:
  // "Stale pre-shared-cookie sessions"). NextResponse.cookies/next/headers
  // cookies() both de-dupe by name, so a second .set() for the same name
  // can't coexist with the first — this appends a raw Set-Cookie header
  // directly instead, which the Fetch spec special-cases to always add a new
  // header line rather than overwrite. Harmless no-op if no stale cookie
  // exists. Runs on every request (not just sign-in), so it self-heals
  // regardless of which request happens to carry the stale cookie.
  if (domain) {
    const staleNames = new Set(
      request.cookies.getAll()
        .map((c) => c.name)
        .filter((name) => name.startsWith("sb-")),
    );
    for (const name of staleNames) {
      response.headers.append(
        "Set-Cookie",
        `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure; HttpOnly`,
      );
    }
  }

  return response;
}

export const config = {
  // Run on everything except static assets and image optimisation.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
