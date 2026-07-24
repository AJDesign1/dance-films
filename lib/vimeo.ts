/**
 * Build a Vimeo *iframe* embed URL (never a direct video-file URL) with
 * anti-copy deterrents baked in. Centralised so player behaviour is tuned in
 * one place.
 *
 * Deterrents here are intentional but limited — screen recording can't be
 * stopped. The real lock is Vimeo's **domain-restricted embed**, enabled at the
 * account level once we're on a paid plan. That needs NO code change: it's a
 * privacy setting on the video/account, and we already only ever use the iframe
 * embed below.
 *
 * Params:
 *  - dnt=1                          → do-not-track (no cookies/analytics)
 *  - title/byline/portrait=0        → strip the author/title chrome
 *  - like/watchlater/share=0        → hide those overlay actions (honoured by
 *                                     the player where supported; download and
 *                                     "watch on Vimeo" are further removed by
 *                                     the account's embed-privacy settings)
 *  - pip=0, badge=0                 → minimal UI
 *  - controls=1, playsinline=1      → keep usable, in-page playback
 */
export function vimeoEmbedUrl(vimeoId: string, opts?: { autoplay?: boolean }): string {
  const params = new URLSearchParams({
    title: "0",
    byline: "0",
    portrait: "0",
    like: "0",
    watchlater: "0",
    share: "0",
    badge: "0",
    pip: "0",
    dnt: "1",
    controls: "1",
    playsinline: "1",
    autoplay: opts?.autoplay ? "1" : "0",
  });
  // A Vimeo id may be a plain numeric id or "id/hash" for unlisted videos.
  return `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`;
}
