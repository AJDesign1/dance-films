"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ShowForm = {
  title: string;
  season: string;
  show_year: string; // raw input
  price: string; // pounds, raw input
  intro_text: string;
  artwork_url: string;
  status: "draft" | "published";
};

function parseForm(f: ShowForm) {
  const year = parseInt(f.show_year, 10);
  const pounds = parseFloat(f.price);
  return {
    title: f.title.trim(),
    season: f.season.trim() || null,
    show_year: Number.isFinite(year) ? year : null,
    price_pence: Number.isFinite(pounds) ? Math.round(pounds * 100) : 0,
    intro_text: f.intro_text.trim() || null,
    artwork_url: f.artwork_url.trim() || null,
    status: f.status,
  };
}

function slugify(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "show";
}

export async function createShow(schoolId: string, slug: string, form: ShowForm): Promise<{ error: string } | never> {
  await requireAdmin();
  const data = parseForm(form);
  if (!data.title) return { error: "Enter a show title." };
  const admin = createAdminClient();

  // unique slug within school
  let showSlug = slugify(data.title);
  const { data: existing } = await admin.from("shows").select("slug").eq("school_id", schoolId).like("slug", `${showSlug}%`);
  const taken = new Set((existing ?? []).map((r) => r.slug));
  if (taken.has(showSlug)) { let i = 2; while (taken.has(`${showSlug}-${i}`)) i++; showSlug = `${showSlug}-${i}`; }

  const { data: last } = await admin.from("shows").select("sort_order").eq("school_id", schoolId).order("sort_order", { ascending: false }).limit(1);
  const next = (last?.[0]?.sort_order ?? -1) + 1;

  const { error } = await admin.from("shows").insert({ school_id: schoolId, slug: showSlug, sort_order: next, ...data });
  if (error) return { error: "Couldn't create the show." };

  revalidatePath(`/admin/${slug}/shows`);
  redirect(`/admin/${slug}/shows`);
}

export async function updateShow(showId: string, slug: string, form: ShowForm): Promise<{ error: string } | never> {
  await requireAdmin();
  const data = parseForm(form);
  if (!data.title) return { error: "Enter a show title." };
  const admin = createAdminClient();
  const { error } = await admin.from("shows").update(data).eq("id", showId);
  if (error) return { error: "Couldn't save the show." };
  revalidatePath(`/admin/${slug}/shows`);
  redirect(`/admin/${slug}/shows`);
}

export async function reorderShow(showId: string, slug: string, dir: -1 | 1): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: row } = await admin.from("shows").select("id, school_id, sort_order").eq("id", showId).maybeSingle();
  if (!row) return { error: "Not found." };
  const { data: list } = await admin.from("shows").select("id, sort_order").eq("school_id", row.school_id).order("sort_order", { ascending: true });
  const arr = list ?? [];
  const idx = arr.findIndex((s) => s.id === showId);
  const n = idx + dir;
  if (n < 0 || n >= arr.length) return { ok: true };
  await admin.from("shows").update({ sort_order: arr[n].sort_order }).eq("id", arr[idx].id);
  await admin.from("shows").update({ sort_order: arr[idx].sort_order }).eq("id", arr[n].id);
  revalidatePath(`/admin/${slug}/shows`);
  return { ok: true };
}
