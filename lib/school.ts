import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient as createAnonClient } from "@supabase/supabase-js";
import { SCHOOL_SLUG_HEADER } from "@/lib/tenant";
import type { Database } from "@/lib/supabase/database.types";
import type { SchoolTheme } from "@/lib/theme";

/** Cache tag for every school row read. Bumped by any admin write to `schools`. */
export const SCHOOLS_CACHE_TAG = "schools";

/**
 * Editable copy for the two content bands on the shop page ("About <school>"
 * and "Meet the media team"). Managed per school at /admin/{slug}/school-page;
 * a band is hidden entirely when its fields are empty.
 */
export type SchoolPageContent = {
  about_text: string | null;
  about_image_url: string | null;
  team_name: string | null;
  team_role: string | null;
  team_bio: string | null;
  team_tagline: string | null;
  team_image_url: string | null;
};

/** Column list for the page-content fields, shared by the school loaders. */
export const PAGE_CONTENT_COLUMNS =
  "about_text, about_image_url, team_name, team_role, team_bio, team_tagline, team_image_url";

export type School = {
  id: string;
  slug: string;
  name: string;
  platform_name: string | null;
  logo_colour_url: string | null;
  logo_white_url: string | null;
  hero_image_url: string | null;
  theme: SchoolTheme;
} & SchoolPageContent;

/**
 * The current tenant for this request, resolved from the subdomain (set on a
 * header by middleware) and loaded from the DB. Uses the anon-scoped server
 * client — `schools` is readable pre-auth for active schools, so this works on
 * the login page too. `cache()` dedupes across a single request render.
 */
/**
 * The school row itself, cached across requests.
 *
 * This is the same row for every visitor to a subdomain and it only changes
 * when an admin edits branding or page content, but it was being fetched on
 * every single request — including the layout, for theming. That's one
 * database round trip per page load, and this app's functions run in the US
 * against a database in London, so a round trip is expensive.
 *
 * Deliberately uses a cookie-less anon client rather than the request-scoped
 * one: `unstable_cache` can't read cookies or headers, and it doesn't need to —
 * the "schools: read active" policy grants `anon` select on active schools, so
 * this returns the same row regardless of who is asking.
 *
 * Writes call revalidateTag(SCHOOLS_CACHE_TAG); the TTL is a safety net so a
 * missed invalidation self-heals in minutes rather than persisting.
 */
const loadSchoolBySlug = unstable_cache(
  async (slug: string): Promise<School | null> => {
    const supabase = createAnonClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from("schools")
      .select(
        `id, slug, name, platform_name, logo_colour_url, logo_white_url, hero_image_url, theme, ${PAGE_CONTENT_COLUMNS}`,
      )
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    return (data as School | null) ?? null;
  },
  ["school-by-slug"],
  { tags: [SCHOOLS_CACHE_TAG], revalidate: 300 },
);

export const getCurrentSchool = cache(async (): Promise<School | null> => {
  const h = await headers();
  const slug = h.get(SCHOOL_SLUG_HEADER);
  if (!slug) return null;
  return loadSchoolBySlug(slug);
});
