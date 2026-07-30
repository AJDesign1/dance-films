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
export function bunnyEmbedUrl(videoId: string, opts?: { autoplay?: boolean }): string | null {
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
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?${params.toString()}`;
}
