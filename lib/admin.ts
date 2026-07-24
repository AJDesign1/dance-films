import "server-only";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SchoolTheme } from "@/lib/theme";

export type ManagedSchool = {
  id: string;
  slug: string;
  name: string;
  status: "active" | "disabled";
  platform_name: string | null;
  logo_colour_url: string | null;
  logo_white_url: string | null;
  hero_image_url: string | null;
  theme: SchoolTheme;
};

/** Gate for all admin pages/actions: must be signed in AND is_admin. */
export async function requireAdmin() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.is_admin) redirect("/shows");
  return profile;
}

/**
 * Load a school for management by slug (service role — admin sees disabled
 * schools and all fields too). Returns null if not found.
 */
export async function getManagedSchool(slug: string): Promise<ManagedSchool | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("schools")
    .select("id, slug, name, status, platform_name, logo_colour_url, logo_white_url, hero_image_url, theme")
    .eq("slug", slug)
    .maybeSingle();
  return (data as ManagedSchool | null) ?? null;
}
