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
 * Fetch a Bunny-hosted still image (a video's poster frame) server-side.
 *
 * Two reasons this goes through us rather than the browser hitting Bunny
 * directly:
 *  - Bunny's Pull Zone has "Block direct url file access" on with an allowed-
 *    referrer list, so a request with no `Referer` (which is what any
 *    server-side fetch sends, including next/image's optimiser) gets a 403.
 *    We set the header explicitly here.
 *  - A Bunny thumbnail URL contains the `bunny_video_id`. Proxying keeps it
 *    off the page entirely, per the anti-copy rule in AI_INSTRUCTIONS.md.
 *
 * The URL is admin-pasted, and this fetch runs on our server, so the host is
 * checked rather than trusted — an arbitrary pasted URL must not become a
 * server-side request to somewhere else.
 */
export async function fetchBunnyImage(rawUrl: string): Promise<Response | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.hostname !== "b-cdn.net" && !url.hostname.endsWith(".b-cdn.net")) return null;

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "dancefilms.co.uk";
  const res = await fetch(url, { headers: { Referer: `https://${root}/` } });
  return res.ok ? res : null;
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
