"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { SCHOOLS_CACHE_TAG } from "@/lib/school";
import { createAdminClient } from "@/lib/supabase/admin";

export type SchoolPageForm = {
  aboutText: string;
  aboutImageUrl: string;
  teamName: string;
  teamRole: string;
  teamBio: string;
  teamTagline: string;
  teamImageUrl: string;
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

  const admin = createAdminClient();
  const { error } = await admin
    .from("schools")
    .update({
      about_text: clean(form.aboutText),
      about_image_url: clean(form.aboutImageUrl),
      team_name: clean(form.teamName),
      team_role: clean(form.teamRole),
      team_bio: clean(form.teamBio),
      team_tagline: clean(form.teamTagline),
      team_image_url: clean(form.teamImageUrl),
    })
    .eq("id", schoolId);

  if (error) return { error: "Couldn't save. Please try again." };

  revalidatePath(`/admin/${slug}/school-page`);
  // The public site reads this school from a cross-request cache.
  revalidateTag(SCHOOLS_CACHE_TAG);
  return { ok: true };
}
