import "server-only";

/**
 * Build a Bunny Stream *iframe* embed URL (never a direct video-file URL).
 * Centralised so player behaviour is tuned in one place — same role
 * lib/vimeo.ts played before the switch to Bunny Stream.
 *
 * Deterrents here are intentional but limited — screen recording can't be
 * stopped. Bunny's stronger options, neither wired up yet (see
 * DECISIONS.md):
 *  - Pull Zone security settings (referrer allowlisting) — Bunny's rough
 *    equivalent of Vimeo's domain-restricted embed. Needs confirming the
 *    exact setting name in the current dashboard.
 *  - Token Authentication — signed, time-limited embed URLs. Stronger than
 *    anything Vimeo offered on a comparable plan, but needs a shared signing
 *    key (BUNNY_TOKEN_AUTH_KEY) and server-side signing logic neither of
 *    which exist yet — a real feature to build, not a flip-a-setting one.
 *
 * Params (Bunny's documented embed query options):
 *  - autoplay        → start playing immediately once loaded
 *  - loop=false       → don't repeat
 *  - muted=false      → keep sound on (autoplay+unmuted works inside our own
 *                       user-initiated overlay, not a page-load autoplay)
 *  - preload=true     → start buffering as soon as the iframe mounts
 *  - responsive=true  → player fills its container (we size the container)
 */
/**
 * Fetch a poster image server-side, from either place one can live.
 *
 * Two sources, because posters arrived in two waves:
 *  - **Bunny** (`*.b-cdn.net`) — a pasted thumbnail URL. Bunny's Pull Zone has
 *    "Block direct url file access" on with an allowed-referrer list, so a
 *    request with no `Referer` — which is what any server-side fetch sends,
 *    including next/image's optimiser — gets a 403. The header is set below.
 *    These URLs also contain the `bunny_video_id`, so proxying keeps it off the
 *    page per the anti-copy rule in AI_INSTRUCTIONS.md.
 *  - **Supabase Storage** — an image uploaded through the admin. Public, needs
 *    no referrer, and carries no video id. It still comes through here so the
 *    entitlement gate in /api/thumbnail applies to every poster equally, rather
 *    than the component having to know where each one came from.
 *
 * Missing the second case is what broke every uploaded thumbnail when per-dance
 * posters moved from pasted URLs to uploads: the host check rejected them and
 * the route 404'd. Hosts are still checked rather than trusted — this fetch
 * runs on our server, so an arbitrary stored URL must not become a request to
 * somewhere else.
 */
export async function fetchPosterImage(rawUrl: string): Promise<Response | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const isBunny = url.hostname === "b-cdn.net" || url.hostname.endsWith(".b-cdn.net");
  const isSupabase = url.hostname.endsWith(".supabase.co");
  if (!isBunny && !isSupabase) return null;

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "dancefilms.co.uk";
  const res = await fetch(url, {
    // Only Bunny needs the referrer; Supabase Storage serves public objects
    // without one.
    headers: isBunny ? { Referer: `https://${root}/` } : undefined,
  });
  return res.ok ? res : null;
}

export type BunnyChapter = { title: string; start: number; end: number };

export type BunnyVideo = {
  chapters: BunnyChapter[];
  /** Length of the recording, seconds. */
  durationSeconds: number | null;
  /** Direct MP4 for the download button, or null when MP4 fallback is off. */
  downloadUrl: string | null;
};

/**
 * Best downloadable rendition, built from what the API already tells us.
 *
 * Bunny returns no direct video URL, but it returns enough to derive one:
 * `thumbnailUrl` is an absolute CDN URL, so its origin *is* the pull zone
 * host — which is otherwise unknowable from the library id alone and would
 * mean yet another environment variable. `availableResolutions` says which
 * play_*.mp4 files exist.
 *
 * Capped at 1080p deliberately: that's the highest Bunny encodes here, and the
 * point is a DVD-replacement download for parents, not the 48GB 4K master
 * sitting behind `original`.
 *
 * Returns null when MP4 fallback is switched off, because then no play_*.mp4
 * exists and any URL built here would 404.
 */
function deriveDownloadUrl(body: {
  guid?: string;
  thumbnailUrl?: string;
  availableResolutions?: string;
  hasMP4Fallback?: boolean;
}): string | null {
  if (!body.hasMP4Fallback || !body.guid || !body.thumbnailUrl) return null;

  let origin: string;
  try {
    origin = new URL(body.thumbnailUrl).origin;
  } catch {
    return null;
  }

  const heights = (body.availableResolutions ?? "")
    .split(",")
    .map((r) => parseInt(r.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 1080);
  if (heights.length === 0) return null;

  return `${origin}/${body.guid}/play_${Math.max(...heights)}p.mp4`;
}

/**
 * A Bunny video's chapters, length and downloadable rendition.
 *
 * Bunny's own chapter marks are the natural source for a show's dance list:
 * `{title, start, end}` maps straight onto title / clip_start_seconds /
 * clip_end_seconds, so a show chaptered once in Bunny can fill the whole
 * performances grid rather than being typed in twice. The length and download
 * link come from the same call — they were being copied by hand from the same
 * dashboard page, and a download link left pointing at a replaced video is
 * exactly the kind of stale paste this removes.
 *
 * Uses the Stream API key, which is *not* the library id — it reads the whole
 * library, so it's server-only and never reaches the browser. A read-only key
 * is enough; this only ever issues a GET.
 */
export async function fetchBunnyVideo(
  videoId: string,
): Promise<BunnyVideo | { error: string }> {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const key = process.env.BUNNY_STREAM_API_KEY;
  if (!libraryId) return { error: "BUNNY_LIBRARY_ID isn't set." };
  if (!key) return { error: "No Bunny API key is configured, so chapters can't be read." };

  let res: Response;
  try {
    res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      headers: { AccessKey: key, accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    return { error: "Couldn't reach Bunny. Please try again." };
  }

  if (res.status === 401 || res.status === 403) {
    return { error: "Bunny rejected the API key. Check BUNNY_STREAM_API_KEY belongs to this video library." };
  }
  if (res.status === 404) return { error: "Bunny doesn't have a video with that ID in this library." };
  if (!res.ok) return { error: `Bunny returned an error (${res.status}).` };

  const body = (await res.json()) as {
    chapters?: { title?: string; start?: number; end?: number }[];
    guid?: string;
    length?: number;
    thumbnailUrl?: string;
    availableResolutions?: string;
    hasMP4Fallback?: boolean;
  };
  const chapters = (body.chapters ?? [])
    .filter((c) => typeof c.start === "number" && typeof c.end === "number")
    .map((c) => ({
      // Bunny titles are free text and often carry double spaces from pasting.
      title: (c.title ?? "").replace(/\s+/g, " ").trim() || "Untitled",
      start: Math.max(0, Math.floor(c.start!)),
      end: Math.max(0, Math.floor(c.end!)),
    }))
    .filter((c) => c.end > c.start)
    .sort((a, b) => a.start - b.start);

  return {
    chapters,
    durationSeconds: typeof body.length === "number" && body.length > 0 ? Math.floor(body.length) : null,
    downloadUrl: deriveDownloadUrl(body),
  };
}

export function bunnyEmbedUrl(videoId: string, opts?: { autoplay?: boolean; startSeconds?: number | null }): string | null {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  if (!libraryId) {
    // Logged, not thrown: callers already treat "no embed URL" as a normal
    // case (ShowExperience renders "No video available."), so a missing
    // config falls back to that instead of a hard 500 on every video click.
    console.error("BUNNY_LIBRARY_ID is not set — video embeds are disabled.");
    return null;
  }

  const params = new URLSearchParams({
    autoplay: opts?.autoplay ? "true" : "false",
    loop: "false",
    muted: "false",
    preload: "true",
    responsive: "true",
  });
  // Belt and braces for a dance that starts partway into the show recording:
  // the authoritative seek is player.js setCurrentTime() once the player is
  // ready (see ShowExperience), but starting the load at roughly the right
  // place avoids a visible flash of the show's opening frame. `t` is what
  // Bunny's own share links use; it isn't in the embed-parameter docs, so
  // treat it as a hint that may be ignored rather than the mechanism.
  if (opts?.startSeconds && opts.startSeconds > 0) {
    params.set("t", String(Math.floor(opts.startSeconds)));
  }
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
}
