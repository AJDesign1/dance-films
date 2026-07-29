/**
 * Multi-tenant subdomain resolution.
 *
 * Production: <slug>.dancefilms.co.uk  → school = <slug>
 * Local dev:  <slug>.localhost:3000    → school = <slug>
 *             (or ?school=<slug> as an override on any host, incl. apex)
 *
 * The apex (dancefilms.co.uk, and the raw Netlify domain) is reserved for the
 * deferred marketing site. An apex/unknown host resolves to `null` — no
 * default tenant — and middleware routes those requests to a placeholder.
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dancefilms.co.uk";

/** Header used to pass the resolved school slug from middleware to the app. */
export const SCHOOL_SLUG_HEADER = "x-school-slug";

export function schoolSlugFromHost(
  host: string | null,
  searchParams?: URLSearchParams,
): string | null {
  const override = searchParams?.get("school");
  if (override) return normalise(override);

  if (!host) return null;

  // strip port
  const hostname = host.split(":")[0].toLowerCase();

  // <slug>.localhost
  if (hostname.endsWith(".localhost")) {
    return normalise(hostname.replace(/\.localhost$/, ""));
  }

  // <slug>.dancefilms.co.uk
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -1 * (ROOT_DOMAIN.length + 1));
    // ignore common non-tenant subdomains
    if (sub && sub !== "www") return normalise(sub);
  }

  // apex, Netlify default domain, bare localhost, unknown hosts → no tenant
  return null;
}

function normalise(slug: string): string {
  return slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}
