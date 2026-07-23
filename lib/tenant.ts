/**
 * Multi-tenant subdomain resolution.
 *
 * Production: <slug>.dancefilms.co.uk  → school = <slug>
 * Local dev:  <slug>.localhost:3000    → school = <slug>
 *             (or ?school=<slug> as a fallback for plain localhost)
 *
 * The apex (dancefilms.co.uk) is reserved for the deferred marketing site.
 * Until it exists, an apex/unknown host falls back to the default school so
 * the platform is viewable during development.
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "dancefilms.co.uk";

/** First-launch default tenant while Liberty is the only live school. */
export const DEFAULT_SCHOOL_SLUG = "liberty";

/** Header used to pass the resolved school slug from middleware to the app. */
export const SCHOOL_SLUG_HEADER = "x-school-slug";

export function schoolSlugFromHost(
  host: string | null,
  searchParams?: URLSearchParams,
): string {
  const override = searchParams?.get("school");
  if (override) return normalise(override);

  if (!host) return DEFAULT_SCHOOL_SLUG;

  // strip port
  const hostname = host.split(":")[0].toLowerCase();

  // <slug>.localhost
  if (hostname.endsWith(".localhost")) {
    return normalise(hostname.replace(/\.localhost$/, ""));
  }
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return DEFAULT_SCHOOL_SLUG;
  }

  // <slug>.dancefilms.co.uk
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = hostname.slice(0, -1 * (ROOT_DOMAIN.length + 1));
    // ignore common non-tenant subdomains
    if (sub && sub !== "www") return normalise(sub);
  }

  // apex, Netlify preview URLs, unknown hosts → default for now
  return DEFAULT_SCHOOL_SLUG;
}

function normalise(slug: string): string {
  return slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
}
