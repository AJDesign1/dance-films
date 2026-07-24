"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ActionResult = { ok: true; message?: string } | { error: string };
type Kind = "group" | "style";

/** "4:12" → 252, "1:12:40" → 4360, "" → null. */
function parseDuration(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const parts = t.split(":").map((x) => parseInt(x, 10));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function rev(slug: string) {
  revalidatePath(`/admin/${slug}/performances`);
}

export async function setFullShowVideo(showId: string, slug: string, vimeoId: string, duration: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("show_videos")
    .upsert({ show_id: showId, full_show_vimeo_id: vimeoId.trim() || null, duration_seconds: parseDuration(duration) }, { onConflict: "show_id" });
  if (error) return { error: "Couldn't save the full-show video." };
  rev(slug);
  return { ok: true };
}

export async function addPerformance(showId: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: last } = await admin.from("performances").select("sort_order").eq("show_id", showId).order("sort_order", { ascending: false }).limit(1);
  const next = (last?.[0]?.sort_order ?? -1) + 1;
  const { error } = await admin.from("performances").insert({ show_id: showId, title: "New performance", vimeo_id: "", sort_order: next });
  if (error) return { error: "Couldn't add performance." };
  rev(slug);
  return { ok: true };
}

export async function updatePerformanceField(id: string, slug: string, field: "title" | "vimeo_id" | "duration", value: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const patch = field === "duration" ? { duration_seconds: parseDuration(value) } : { [field]: value.trim() };
  const { error } = await admin.from("performances").update(patch).eq("id", id);
  if (error) return { error: "Couldn't save." };
  rev(slug);
  return { ok: true };
}

export async function setPerformanceCategory(perfId: string, slug: string, kind: Kind, categoryId: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: perf } = await admin.from("performances").select("show_id").eq("id", perfId).maybeSingle();
  if (!perf) return { error: "Not found." };
  const { data: kindCats } = await admin.from("categories").select("id").eq("show_id", perf.show_id).eq("kind", kind);
  const kindIds = (kindCats ?? []).map((c) => c.id);
  if (kindIds.length) await admin.from("performance_categories").delete().eq("performance_id", perfId).in("category_id", kindIds);
  if (categoryId) await admin.from("performance_categories").insert({ performance_id: perfId, category_id: categoryId });
  rev(slug);
  return { ok: true };
}

export async function removePerformance(id: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("performances").delete().eq("id", id);
  rev(slug);
  return { ok: true };
}

export async function reorderPerformance(id: string, slug: string, dir: -1 | 1): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: row } = await admin.from("performances").select("id, show_id, sort_order").eq("id", id).maybeSingle();
  if (!row) return { error: "Not found." };
  const { data: list } = await admin.from("performances").select("id, sort_order").eq("show_id", row.show_id).order("sort_order", { ascending: true });
  const arr = list ?? [];
  const idx = arr.findIndex((p) => p.id === id);
  const n = idx + dir;
  if (n < 0 || n >= arr.length) return { ok: true };
  await admin.from("performances").update({ sort_order: arr[n].sort_order }).eq("id", arr[idx].id);
  await admin.from("performances").update({ sort_order: arr[idx].sort_order }).eq("id", arr[n].id);
  rev(slug);
  return { ok: true };
}

/** One per line: "Title | Group | Vimeo | Duration" (group/vimeo/duration optional). */
export async function bulkAddPerformances(showId: string, slug: string, text: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: "Nothing to add." };

  // Existing group categories for this show (to link/create by name).
  const { data: groupCats } = await admin.from("categories").select("id, name").eq("show_id", showId).eq("kind", "group");
  const byName = new Map((groupCats ?? []).map((c) => [c.name.toLowerCase(), c.id]));

  const { data: last } = await admin.from("performances").select("sort_order").eq("show_id", showId).order("sort_order", { ascending: false }).limit(1);
  let order = (last?.[0]?.sort_order ?? -1) + 1;
  let nextCatOrder = (groupCats ?? []).length;

  let added = 0;
  for (const line of lines) {
    const [title, group, vimeo, dur] = line.split("|").map((x) => (x ?? "").trim());
    const { data: perf, error } = await admin
      .from("performances")
      .insert({ show_id: showId, title: title || "Untitled", vimeo_id: vimeo || "", duration_seconds: parseDuration(dur || ""), sort_order: order++ })
      .select("id")
      .single();
    if (error || !perf) continue;
    added++;

    if (group) {
      let catId = byName.get(group.toLowerCase());
      if (!catId) {
        const { data: newCat } = await admin.from("categories").insert({ show_id: showId, name: group, kind: "group", sort_order: nextCatOrder++ }).select("id").single();
        if (newCat) { catId = newCat.id; byName.set(group.toLowerCase(), catId); }
      }
      if (catId) await admin.from("performance_categories").insert({ performance_id: perf.id, category_id: catId });
    }
  }

  rev(slug);
  return added ? { ok: true, message: `${added} added.` } : { error: "No performances added." };
}
