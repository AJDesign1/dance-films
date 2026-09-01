"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { SCHOOLS_CACHE_TAG } from "@/lib/school";
import { createAdminClient } from "@/lib/supabase/admin";

export type SchoolResult = { error: string } | never;

const DEFAULT_THEME = {
  primary: "#13D1C4",
  secondary: "#43576E",
  ink: "#0B171B",
  paper: "#F5F1E8",
  accentWarm: "#E8A54B",
  font_key: "Big Shoulders Display",
  theme: "dark",
};

/** Create a school and jump straight into its branding config to finish setup. */
export async function createSchool(name: string, subdomain: string): Promise<SchoolResult> {
  await requireAdmin();
  const cleanName = name.trim();
  const sub = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!cleanName) return { error: "Enter a school name." };
  if (!sub) return { error: "Enter a subdomain." };

  const admin = createAdminClient();
  const { data: clash } = await admin.from("schools").select("id").eq("slug", sub).maybeSingle();
  if (clash) return { error: "That subdomain is already taken." };

  const { error } = await admin
    .from("schools")
    .insert({ slug: sub, name: cleanName, platform_name: cleanName, status: "active", theme: DEFAULT_THEME });
  if (error) return { error: "Couldn't create the school." };

  redirect(`/admin/${sub}/branding`);
}

export async function toggleSchoolStatus(id: string, next: "active" | "disabled"): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("schools").update({ status: next }).eq("id", id);
  if (error) return { error: "Couldn't update status." };
  revalidatePath("/admin");
  revalidateTag(SCHOOLS_CACHE_TAG);
  return { ok: true };
}

/**
 * Permanently delete a school and everything scoped to it (shows, show
 * videos, categories, performances, entitlements, invited emails — all
 * on delete cascade from schools/shows in the schema). Parent profiles
 * themselves are untouched; they just lose entitlements to this school.
 *
 * Blocked if the school has any orders on record: orders.show_id has no
 * cascade specifically so purchase history is never silently destroyed —
 * disable the school instead if it needs to stop selling but keep records.
 */
export async function deleteSchool(id: string): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: schoolShows } = await admin.from("shows").select("id").eq("school_id", id);
  const showIds = (schoolShows ?? []).map((s) => s.id);

  if (showIds.length) {
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("show_id", showIds);
    if (count && count > 0) {
      return {
        error: `This school has ${count} order${count === 1 ? "" : "s"} on record and can't be deleted — disable it instead to keep the purchase history.`,
      };
    }
  }

  const { error } = await admin.from("schools").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the school." };
  revalidatePath("/admin");
  revalidateTag(SCHOOLS_CACHE_TAG);
  return { ok: true };
}
