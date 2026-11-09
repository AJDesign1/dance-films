"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { SCHOOLS_CACHE_TAG } from "@/lib/school";
import { storageReference } from "@/lib/media";
import { createAdminClient } from "@/lib/supabase/admin";

export type SchoolPageForm = {
  aboutText: string;
  aboutImageUrl: string;
  galleryImageUrls: string[];
  quoteText: string;
  quoteName: string;
  quoteRole: string;
};

export type SchoolPageResult = { ok: true } | { error: string };

/** Empty stays null in the DB — that's what hides a band on the shop page. */
const clean = (v: string) => v.trim() || null;

export async function updateSchoolPage(
  schoolId: string,
  slug: string,
  form: SchoolPageForm,
): Promise<SchoolPageResult> {
  await requireAdmin();

  if (!form || [form.aboutText, form.aboutImageUrl, form.quoteText, form.quoteName, form.quoteRole].some(v => typeof v !== "string") ||
      !Array.isArray(form.galleryImageUrls) || form.galleryImageUrls.length > 6 ||
      form.galleryImageUrls.some(url => typeof url !== "string")) {
    return { error: "Please use up to six gallery images and valid text fields." };
  }
  if (form.quoteText.length > 5000 || form.quoteName.length > 200 || form.quoteRole.length > 200) {
    return { error: "Keep the quote under 5,000 characters and the name and role under 200 characters each." };
  }
  const gallery = form.galleryImageUrls.map(url => url.trim());
  if (new Set(gallery).size !== gallery.length || gallery.some(url => {
    const ref = storageReference(url);
    return !ref?.path.startsWith(`${schoolId}/`);
  })) return { error: "Choose distinct gallery images from this school's media library." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("schools")
    .update({
      about_text: clean(form.aboutText),
      about_image_url: clean(form.aboutImageUrl),
      gallery_image_urls: gallery,
      quote_text: clean(form.quoteText),
      quote_name: clean(form.quoteName),
      quote_role: clean(form.quoteRole),
    })
    .eq("id", schoolId)
    .eq("slug", slug)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save. Please try again." };

  revalidatePath(`/admin/${slug}/school-page`);
  // The public site reads this school from a cross-request cache.
  revalidateTag(SCHOOLS_CACHE_TAG);
  return { ok: true };
}
