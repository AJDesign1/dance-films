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

export type UploadResult = { url: string } | { error: string };

/** Image slots on a school — logos and photos, all in the `branding` bucket. */
export type BrandingSlot = "logo-colour" | "logo-white" | "sign-in" | "about" | "team";

/**
 * Upload a branding image (logo/photo) to the public `branding` bucket via the
 * service role and return its public URL. The URL is then saved with the rest
 * of the branding form. Accepts images up to 2MB (incl. SVG).
 */
export async function uploadBrandingImage(
  schoolId: string,
  slot: BrandingSlot,
  formData: FormData,
): Promise<UploadResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected." };
  if (!file.type.startsWith("image/")) return { error: "Please choose an image file." };
  if (file.size > 2 * 1024 * 1024) return { error: "Image must be under 2MB." };

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${schoolId}/${slot}-${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from("branding").upload(path, file, { contentType: file.type, upsert: true });
  if (error) return { error: "Upload failed. Please try again." };

  const { data } = admin.storage.from("branding").getPublicUrl(path);
  return { url: data.publicUrl };
}

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
