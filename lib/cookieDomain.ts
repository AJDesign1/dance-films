// Deliberately NOT server-only: shared verbatim by the browser Supabase
// client too (lib/supabase/client.ts), so the same cookie domain rule
// applies everywhere a session cookie gets written.
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dancefilms.co.uk";

/**
 * Shared cookie domain so one auth session works across the apex and every
 * school subdomain — e.g. signing in at dancefilms.co.uk/admin and clicking
 * "View site" lands already signed in on liberty.dancefilms.co.uk, instead of
 * the host-only cookie a plain Set-Cookie would otherwise produce.
 *
 * Returns undefined for localhost/unknown hosts, where a domain-scoped cookie
 * would just be silently rejected by the browser (its Domain must match the
 * page's own registrable domain).
 */
export function sharedCookieDomain(host: string | null): string | undefined {
  if (!host) return undefined;
  const hostname = host.split(":")[0].toLowerCase();
  return hostname === ROOT_DOMAIN || hostname.endsWith(`.${ROOT_DOMAIN}`)
    ? `.${ROOT_DOMAIN}`
    : undefined;
}
