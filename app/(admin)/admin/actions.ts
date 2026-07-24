"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
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
  return { ok: true };
}
