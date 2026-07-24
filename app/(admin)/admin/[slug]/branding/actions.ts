"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type BrandingForm = {
  name: string;
  platformName: string;
  subdomain: string;
  logoColourUrl: string;
  logoWhiteUrl: string;
  signInImageUrl: string;
  primary: string;
  secondary: string;
  ink: string;
  paper: string;
  accentWarm: string;
  fontKey: string;
  theme: "light" | "dark";
};

export type BrandingResult = { ok: true } | { error: string };

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function updateBranding(schoolId: string, slug: string, form: BrandingForm): Promise<BrandingResult> {
  await requireAdmin();

  const name = form.name.trim();
  if (!name) return { error: "School name can't be empty." };

  const newSub = form.subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!newSub) return { error: "Enter a valid subdomain." };
  for (const [label, v] of [["Primary", form.primary], ["Secondary", form.secondary], ["Ink", form.ink], ["Paper", form.paper], ["Accent", form.accentWarm]] as const) {
    if (!HEX.test(v)) return { error: `${label} must be a hex colour like #13D1C4.` };
  }

  const admin = createAdminClient();

  // Subdomain must stay unique across schools.
  if (newSub !== slug) {
    const { data: clash } = await admin.from("schools").select("id").eq("slug", newSub).maybeSingle();
    if (clash) return { error: "That subdomain is already taken." };
  }

  const theme = {
    primary: form.primary,
    secondary: form.secondary,
    ink: form.ink,
    paper: form.paper,
    accentWarm: form.accentWarm,
    font_key: form.fontKey,
    theme: form.theme,
  };

  const { error } = await admin
    .from("schools")
    .update({
      name,
      platform_name: form.platformName.trim() || null,
      slug: newSub,
      logo_colour_url: form.logoColourUrl.trim() || null,
      logo_white_url: form.logoWhiteUrl.trim() || null,
      hero_image_url: form.signInImageUrl.trim() || null,
      theme,
    })
    .eq("id", schoolId);

  if (error) return { error: "Couldn't save branding. Please try again." };

  if (newSub !== slug) redirect(`/admin/${newSub}/branding`);
  revalidatePath(`/admin/${slug}/branding`);
  return { ok: true };
}
