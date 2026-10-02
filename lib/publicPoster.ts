/**
 * Direct CDN URL for a poster that lives in Supabase's public storage, or null
 * when the image must stay behind the /api/thumbnail proxy.
 *
 * Posters are uploads (or browser-generated frames) in the public `artwork`
 * bucket since the thumbnail rework — their URLs carry no Bunny video id and
 * the files are publicly addressable already, so proxying them bought no
 * protection and cost a function invocation plus an RLS read per image. A
 * show-page grid of 14 dances fired 14 concurrent invocations, which is
 * exactly the burst that fans Netlify out into fresh cold instances.
 *
 * Bunny-hosted posters (the URL embeds the video id) return null and keep
 * using the proxy — that rule is the whole reason the proxy exists.
 *
 * Raster images are routed through Supabase's render endpoint so the grid
 * gets a resized file (~10–30KB, matching what the sharp proxy produced)
 * instead of the full upload; formats the endpoint can't transform
 * (svg, unknown) are served as the stored object.
 *
 * Width AND height are both required, with resize=cover: given only a width,
 * the endpoint squashes that dimension while keeping the original height
 * (measured: a 2000×1118 poster came back 400×1118), and that distorted
 * portrait blown up by the tile's own object-fit:cover is how the grid ends
 * up showing giant crops. Pass the box's real aspect.
 */
export function publicPosterSrc(
  url: string | null | undefined,
  width: number,
  height: number,
): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(".supabase.co")) return null;
    if (!u.pathname.includes("/storage/v1/object/public/")) return null;

    if (/\.(webp|jpe?g|png)$/i.test(u.pathname)) {
      u.pathname = u.pathname.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/",
      );
      u.searchParams.set("width", String(width));
      u.searchParams.set("height", String(height));
      u.searchParams.set("resize", "cover");
      u.searchParams.set("quality", "78");
    }
    return u.toString();
  } catch {
    return null;
  }
}
