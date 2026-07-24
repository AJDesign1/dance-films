"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true } | { error: string };
type Kind = "group" | "style";

export async function addCategory(showId: string, slug: string, name: string, kind: Kind): Promise<ActionResult> {
  await requireAdmin();
  const clean = name.trim();
  if (!clean) return { error: "Enter a name." };
  const admin = createAdminClient();
  const { data: dup } = await admin.from("categories").select("id").eq("show_id", showId).eq("kind", kind).ilike("name", clean).maybeSingle();
  if (dup) return { error: "That already exists." };
  const { data: last } = await admin.from("categories").select("sort_order").eq("show_id", showId).eq("kind", kind).order("sort_order", { ascending: false }).limit(1);
  const next = (last?.[0]?.sort_order ?? -1) + 1;
  const { error } = await admin.from("categories").insert({ show_id: showId, name: clean, kind, sort_order: next });
  if (error) return { error: "Couldn't add." };
  revalidatePath(`/admin/${slug}/categories`);
  return { ok: true };
}

export async function renameCategory(id: string, slug: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const clean = name.trim();
  if (!clean) return { error: "Name can't be empty." };
  const admin = createAdminClient();
  await admin.from("categories").update({ name: clean }).eq("id", id);
  revalidatePath(`/admin/${slug}/categories`);
  return { ok: true };
}

export async function removeCategory(id: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("categories").delete().eq("id", id);
  revalidatePath(`/admin/${slug}/categories`);
  return { ok: true };
}

export async function reorderCategory(id: string, slug: string, dir: -1 | 1): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: cat } = await admin.from("categories").select("id, show_id, kind, sort_order").eq("id", id).maybeSingle();
  if (!cat) return { error: "Not found." };
  const { data: list } = await admin.from("categories").select("id, sort_order").eq("show_id", cat.show_id).eq("kind", cat.kind).order("sort_order", { ascending: true });
  const arr = list ?? [];
  const idx = arr.findIndex((c) => c.id === id);
  const n = idx + dir;
  if (n < 0 || n >= arr.length) return { ok: true };
  await admin.from("categories").update({ sort_order: arr[n].sort_order }).eq("id", arr[idx].id);
  await admin.from("categories").update({ sort_order: arr[idx].sort_order }).eq("id", arr[n].id);
  revalidatePath(`/admin/${slug}/categories`);
  return { ok: true };
}
