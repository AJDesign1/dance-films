import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { SCHOOL_SLUG_HEADER } from "@/lib/tenant";
import type { SchoolTheme } from "@/lib/theme";

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
export const getCurrentSchool = cache(async (): Promise<School | null> => {
  const h = await headers();
  const slug = h.get(SCHOOL_SLUG_HEADER);
  if (!slug) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("schools")
    .select(
      `id, slug, name, platform_name, logo_colour_url, logo_white_url, hero_image_url, theme, ${PAGE_CONTENT_COLUMNS}`,
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  return (data as School | null) ?? null;
});
