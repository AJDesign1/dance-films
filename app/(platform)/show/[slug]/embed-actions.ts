"use server";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bunnyEmbedUrl } from "@/lib/bunny";

/**
 * What the player needs to show one thing: where to load it from, and (for a
 * dance that's a section of the show recording) where to start and stop.
 *
 * The timestamps are safe to send to the client — they're positions, not
 * access. The video id still never leaves the server except inside `url`.
 */
export type PlaybackSource = {
  url: string;
  startSeconds: number | null;
  endSeconds: number | null;
};

/**
 * Resolve a play URL on demand. The bunny_video_id never leaves the server
 * except inside the returned iframe embed URL — it's not in the page markup
 * or the initial client payload. RLS re-verifies entitlement here: the select
 * returns a row only if the caller owns the show, so a guessed id yields null.
 *
 * A dance resolves one of two ways (`performances.video_source`):
 *  - 'show'       → the show's own full recording, plus the dance's start/end
 *                   so the player can present a slice of it as its own video.
 *  - 'standalone' → its own uploaded video, exactly as before.
 * Both re-check entitlement the same way: the second read is scoped to the
 * show_id that came off the (already RLS-filtered) performance row, so a
 * chapter can't reach a recording the caller isn't entitled to.
 */
export async function getEmbedUrl(kind: "full" | "perf", id: string): Promise<PlaybackSource | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();

  if (kind === "perf") {
    const { data: perf } = await supabase
      .from("performances")
      .select("show_id, video_source, bunny_video_id, clip_start_seconds, clip_end_seconds")
      .eq("id", id)
      .maybeSingle();
    if (!perf) return null;

    if (perf.video_source === "standalone") {
      const url = perf.bunny_video_id ? bunnyEmbedUrl(perf.bunny_video_id, { autoplay: true }) : null;
      return url ? { url, startSeconds: null, endSeconds: null } : null;
    }

    const { data: video } = await supabase
      .from("show_videos")
      .select("full_show_bunny_video_id")
      .eq("show_id", perf.show_id)
      .maybeSingle();
    if (!video?.full_show_bunny_video_id) return null;

    const url = bunnyEmbedUrl(video.full_show_bunny_video_id, {
      autoplay: true,
      startSeconds: perf.clip_start_seconds,
    });
    return url ? { url, startSeconds: perf.clip_start_seconds, endSeconds: perf.clip_end_seconds } : null;
  }

  // The full show always plays from the top with no end limit, whatever the
  // dances inside it are configured to do.
  const { data } = await supabase
    .from("show_videos")
    .select("full_show_bunny_video_id")
    .eq("show_id", id)
    .maybeSingle();
  if (!data?.full_show_bunny_video_id) return null;
  const url = bunnyEmbedUrl(data.full_show_bunny_video_id, { autoplay: true });
  return url ? { url, startSeconds: null, endSeconds: null } : null;
}

/**
 * Resolve the full-show download URL on demand. RLS returns the row only if the
 * caller owns the show, so the URL never reaches a non-entitled user and is
 * never rendered into page markup.
 *
 * Also records the download (informational "Downloaded" badge only — see the
 * `downloads` table; this never restricts or blocks a repeat download). Only
 * called after the customer has confirmed in the download modal, so this
 * fires on genuine download intent, not on page load.
 */
export async function getFullShowDownloadUrl(showId: string): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("show_videos")
    .select("download_url")
    .eq("show_id", showId)
    .maybeSingle();

  if (!data?.download_url) return null;

  // Best-effort: a failed insert shouldn't block the download itself, only
  // the "Downloaded" badge would go stale until the next successful one.
  await supabase
    .from("downloads")
    .upsert(
      { user_id: user.id, show_id: showId },
      { onConflict: "user_id,show_id", ignoreDuplicates: true },
    );

  return data.download_url;
}
