"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseClock } from "@/lib/format";
import { fetchBunnyChapters } from "@/lib/bunny";
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

/** One dance's editable fields, as the admin grid holds them. */
export type PerformanceDraft = {
  id: string;
  title: string;
  videoSource: VideoSource;
  bunnyVideoId: string;
  clipStart: string; // "12:45"
  clipEnd: string;
  duration: string; // only used for standalone; clips derive it
  groupId: string;
  styleId: string;
};

export type FullShowDraft = {
  bunnyVideoId: string;
  duration: string;
  downloadUrl: string;
  thumbnailUrl: string;
};

/**
 * Save the whole Performances screen in one go.
 *
 * The screen used to write on every field blur. That kept the database current
 * without a Save button, but it also meant a half-typed value could persist
 * because focus moved, and there was no way to review a set of edits before
 * committing them. Now the grid buffers changes and sends them here together.
 *
 * Validation runs over the whole batch *before* anything is written, so a bad
 * timestamp on one dance doesn't leave the other rows half-saved.
 */
export async function savePerformancesPage(
  showId: string,
  slug: string,
  full: FullShowDraft,
  rows: PerformanceDraft[],
): Promise<ActionResult> {
  await requireAdmin();

  // ---- validate everything first ----
  for (const r of rows) {
    if (r.videoSource !== "show") continue;
    const start = parseDuration(r.clipStart);
    const end = parseDuration(r.clipEnd);
    const label = r.title.trim() || "Untitled";
    if (r.clipStart.trim() && start === null) return { error: `${label}: start time should look like 12:45 or 1:12:30.` };
    if (r.clipEnd.trim() && end === null) return { error: `${label}: end time should look like 12:45 or 1:12:30.` };
    if (start !== null && end !== null && end <= start) return { error: `${label}: the end time must be after the start time.` };
  }

  const admin = createAdminClient();

  const { error: videoError } = await admin.from("show_videos").upsert(
    {
      show_id: showId,
      full_show_bunny_video_id: full.bunnyVideoId.trim() || null,
      duration_seconds: parseDuration(full.duration),
      download_url: full.downloadUrl.trim() || null,
      full_show_thumbnail_url: full.thumbnailUrl.trim() || null,
    },
    { onConflict: "show_id" },
  );
  if (videoError) return { error: "Couldn't save the full-show video." };

  // Category ids for this show, split by kind — needed to clear only the links
  // of the kind being set, the same way setPerformanceCategory does.
  const { data: cats } = await admin.from("categories").select("id, kind").eq("show_id", showId);
  const idsByKind: Record<Kind, string[]> = {
    group: (cats ?? []).filter((c) => c.kind === "group").map((c) => c.id),
    style: (cats ?? []).filter((c) => c.kind === "style").map((c) => c.id),
  };

  for (const r of rows) {
    const isChapter = r.videoSource === "show";
    const start = isChapter ? parseDuration(r.clipStart) : null;
    const end = isChapter ? parseDuration(r.clipEnd) : null;

    const { error } = await admin
      .from("performances")
      .update({
        title: r.title.trim() || "Untitled",
        video_source: r.videoSource,
        bunny_video_id: r.bunnyVideoId.trim(),
        clip_start_seconds: start,
        clip_end_seconds: end,
        // A clip's length is end − start; a standalone upload keeps whatever
        // the admin typed.
        duration_seconds: isChapter
          ? start !== null && end !== null
            ? end - start
            : null
          : parseDuration(r.duration),
      })
      .eq("id", r.id);
    if (error) return { error: `Couldn't save "${r.title.trim() || "Untitled"}".` };

    for (const kind of ["group", "style"] as Kind[]) {
      const chosen = kind === "group" ? r.groupId : r.styleId;
      const kindIds = idsByKind[kind];
      if (kindIds.length) {
        await admin.from("performance_categories").delete().eq("performance_id", r.id).in("category_id", kindIds);
      }
      if (chosen) {
        await admin.from("performance_categories").insert({ performance_id: r.id, category_id: chosen });
      }
    }
  }

  rev(slug);
  return { ok: true, message: `Saved ${rows.length} performance${rows.length === 1 ? "" : "s"}.` };
}

/** A Bunny chapter alongside whether this show already has a dance at that point. */
export type ChapterPreviewRow = {
  title: string;
  start: number;
  end: number;
  alreadyImported: boolean;
};

/**
 * What "Import from Bunny" would do, without doing it.
 *
 * Matching is on start time rather than title: a title can be edited here after
 * import (and often is — Bunny's chapter names are working notes), whereas the
 * start second is what actually identifies the dance inside the recording. So
 * re-importing after adding a chapter in Bunny brings in only the new one and
 * leaves existing rows, including their edited titles, alone.
 */
export async function previewBunnyChapters(
  showId: string,
): Promise<{ rows: ChapterPreviewRow[] } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: video } = await admin
    .from("show_videos")
    .select("full_show_bunny_video_id")
    .eq("show_id", showId)
    .maybeSingle();

  if (!video?.full_show_bunny_video_id) {
    return { error: "Set the full-show Bunny video ID first — chapters are read from that video." };
  }

  const result = await fetchBunnyChapters(video.full_show_bunny_video_id);
  if ("error" in result) return result;
  if (result.chapters.length === 0) {
    return { error: "That video has no chapters in Bunny yet. Add them there, then import." };
  }

  const { data: existing } = await admin
    .from("performances")
    .select("clip_start_seconds")
    .eq("show_id", showId);
  const taken = new Set((existing ?? []).map((p) => p.clip_start_seconds).filter((s): s is number => s !== null));

  return {
    rows: result.chapters.map((c) => ({ ...c, alreadyImported: taken.has(c.start) })),
  };
}

/**
 * Create a dance for each Bunny chapter this show doesn't already have,
 * pointed at the show's own recording with the chapter's timings.
 */
export async function importBunnyChapters(showId: string, slug: string): Promise<ActionResult> {
  await requireAdmin();

  const preview = await previewBunnyChapters(showId);
  if ("error" in preview) return preview;

  const toAdd = preview.rows.filter((r) => !r.alreadyImported);
  if (toAdd.length === 0) return { ok: true, message: "Every chapter is already in the list." };

  const admin = createAdminClient();
  const { data: last } = await admin
    .from("performances")
    .select("sort_order")
    .eq("show_id", showId)
    .order("sort_order", { ascending: false })
    .limit(1);
  let order = (last?.[0]?.sort_order ?? -1) + 1;

  const { error } = await admin.from("performances").insert(
    toAdd.map((c) => ({
      show_id: showId,
      title: c.title,
      bunny_video_id: "",
      video_source: "show" as const,
      clip_start_seconds: c.start,
      clip_end_seconds: c.end,
      duration_seconds: c.end - c.start,
      sort_order: order++,
    })),
  );
  if (error) return { error: "Couldn't add those chapters. Please try again." };

  rev(slug);
  const skipped = preview.rows.length - toAdd.length;
  return {
    ok: true,
    message:
      `Added ${toAdd.length} performance${toAdd.length === 1 ? "" : "s"} from Bunny` +
      (skipped > 0 ? ` (${skipped} already there).` : "."),
  };
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
 * Poster image for a dance or for the full show, uploaded rather than pasted
 * as a URL.
 *
 * A dance playing a slice of the show video has no Bunny thumbnail to copy —
 * Bunny generates poster frames per video, not per timestamp — so there is no
 * URL to paste for the majority case. The full show does have one, but its
 * filename changes when a custom thumbnail is set in Bunny, so a pasted URL
 * silently keeps serving the old auto-generated frame. Uploading here removes
 * both problems, and matches how branding and show artwork already work.
 */
export async function uploadThumbnailImage(schoolId: string, formData: FormData): Promise<UploadResult> {
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
