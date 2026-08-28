"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseClock } from "@/lib/format";
import { MAX_IMAGE_BYTES, tooLargeMessage } from "@/lib/uploads";

export type ActionResult = { ok: true; message?: string } | { error: string };
export type UploadResult = { url: string } | { error: string };
type Kind = "group" | "style";
type VideoSource = "show" | "standalone";

// Was a local copy; the same "1:12:40" parsing is now needed for clip start/end
// times too, so it lives in lib/format alongside the formatter that writes it.
const parseDuration = parseClock;

function rev(slug: string) {
  revalidatePath(`/admin/${slug}/performances`);
}

export async function setFullShowVideo(showId: string, slug: string, bunnyVideoId: string, duration: string, downloadUrl: string, thumbnailUrl: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("show_videos")
    .upsert(
      {
        show_id: showId,
        full_show_bunny_video_id: bunnyVideoId.trim() || null,
        duration_seconds: parseDuration(duration),
        download_url: downloadUrl.trim() || null,
        full_show_thumbnail_url: thumbnailUrl.trim() || null,
      },
      { onConflict: "show_id" },
    );
  if (error) return { error: "Couldn't save the full-show video." };
  rev(slug);
  return { ok: true };
}

export async function addPerformance(showId: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: last } = await admin.from("performances").select("sort_order").eq("show_id", showId).order("sort_order", { ascending: false }).limit(1);
  const next = (last?.[0]?.sort_order ?? -1) + 1;
  const { error } = await admin.from("performances").insert({ show_id: showId, title: "New performance", bunny_video_id: "", sort_order: next });
  if (error) return { error: "Couldn't add performance." };
  rev(slug);
  return { ok: true };
}

export async function updatePerformanceField(id: string, slug: string, field: "title" | "bunny_video_id" | "duration" | "thumbnail_url", value: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const patch = field === "duration" ? { duration_seconds: parseDuration(value) } : { [field]: value.trim() };
  const { error } = await admin.from("performances").update(patch).eq("id", id);
  if (error) return { error: "Couldn't save." };
  rev(slug);
  return { ok: true };
}

/**
 * Switch a dance between playing a slice of the show video and playing its own
 * upload. Only the flag changes — the other source's data is left in place, so
 * flipping back and forth doesn't destroy a Bunny id or a pair of timestamps
 * the admin might still want.
 */
export async function setPerformanceVideoSource(id: string, slug: string, source: VideoSource): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("performances").update({ video_source: source }).eq("id", id);
  if (error) return { error: "Couldn't change the video source." };
  rev(slug);
  return { ok: true };
}

/**
 * Start/end of a dance within the show recording, entered as "12:45" or
 * "1:12:30". Saved together because they're validated against each other: the
 * DB has a check constraint requiring end > start, so writing one at a time
 * could otherwise be rejected purely because of the value already in the other
 * column. Blank clears (null) — a dance with no end simply plays on.
 */
export async function setPerformanceClip(id: string, slug: string, startInput: string, endInput: string): Promise<ActionResult> {
  await requireAdmin();
  const start = parseDuration(startInput);
  const end = parseDuration(endInput);
  if (startInput.trim() && start === null) return { error: "Start time should look like 12:45 or 1:12:30." };
  if (endInput.trim() && end === null) return { error: "End time should look like 12:45 or 1:12:30." };
  if (start !== null && end !== null && end <= start) return { error: "The end time must be after the start time." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("performances")
    .update({
      clip_start_seconds: start,
      clip_end_seconds: end,
      // Length is derived for clips rather than typed twice — it can't drift
      // out of step with the timestamps that actually control playback.
      duration_seconds: start !== null && end !== null ? end - start : null,
    })
    .eq("id", id);
  if (error) return { error: "Couldn't save those times." };
  rev(slug);
  return { ok: true };
}

/**
 * Per-dance poster image, uploaded rather than pasted as a URL.
 *
 * A dance playing a slice of the show video has no Bunny thumbnail to copy —
 * Bunny generates poster frames per video, not per timestamp — so there is no
 * URL to paste for the majority case. Uploads also match how branding and show
 * artwork already work (see DECISIONS.md); the URL field was the stopgap.
 */
export async function uploadPerformanceThumbnail(schoolId: string, formData: FormData): Promise<UploadResult> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "No file selected." };
  if (!file.type.startsWith("image/")) return { error: "Please choose an image file." };
  if (file.size > MAX_IMAGE_BYTES) return { error: tooLargeMessage(MAX_IMAGE_BYTES) };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${schoolId}/${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from("artwork")
    .upload(path, file, { contentType: file.type, upsert: true, cacheControl: "31536000" });
  if (error) return { error: "Upload failed. Please try again." };

  const { data } = admin.storage.from("artwork").getPublicUrl(path);
  return { url: data.publicUrl };
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

/** One per line: "Title | Group | Bunny video ID | Duration" (group/id/duration optional). */
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
    const [title, group, bunnyVideoId, dur] = line.split("|").map((x) => (x ?? "").trim());
    const { data: perf, error } = await admin
      .from("performances")
      .insert({
        show_id: showId,
        title: title || "Untitled",
        bunny_video_id: bunnyVideoId || "",
        // A pasted line that names its own video means it, so don't let the
        // column default ('show') quietly point it at the full show instead.
        video_source: bunnyVideoId ? "standalone" : "show",
        duration_seconds: parseDuration(dur || ""),
        sort_order: order++,
      })
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
