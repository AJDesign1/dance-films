import { NextResponse } from "next/server";
import sharp from "sharp";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchPosterImage } from "@/lib/bunny";

// Bunny's poster frames are fetched with an outbound `Referer` header, and
// resized with sharp — both Node-only.
export const runtime = "nodejs";

const NOT_FOUND = new NextResponse(null, { status: 404 });

/**
 * Widths the two poster surfaces actually render at (the full-show button is
 * full-bleed; the performance grid tiles are 150px, 96px on mobile), doubled
 * for retina. Bunny hands back the raw frame at capture resolution — 3818px
 * wide and 6MB for the first real upload — so this is the difference between
 * a poster and a page-killing download, the same lesson `next/image` exists
 * to apply to the school's own photos (see DECISIONS.md).
 */
const WIDTH = { show: 1600, perf: 400 } as const;

/**
 * Video poster frames, proxied.
 *
 * Same entitlement model as `getEmbedUrl` — the select runs as the caller
 * under RLS, so a row (and therefore an image) comes back only for a show
 * they own. A guessed id yields nothing.
 *
 * Proxying is what keeps the `bunny_video_id` out of page markup: the stored
 * Bunny URL contains it, so handing that URL to the browser would leak it on
 * every show page. The client only ever sees `/api/thumbnail/perf/<row id>`.
 *
 * `private` in the cache header is deliberate, not conservative boilerplate:
 * these responses are per-user gated, so a shared CDN must never hold one and
 * serve it to somebody who doesn't own the show.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  const { kind, id } = await params;
  if (kind !== "perf" && kind !== "show") return NOT_FOUND;

  const user = await getUser();
  if (!user) return NOT_FOUND;

  const supabase = await createClient();

  const url =
    kind === "perf"
      ? (await supabase.from("performances").select("thumbnail_url").eq("id", id).maybeSingle()).data?.thumbnail_url
      : (await supabase.from("show_videos").select("full_show_thumbnail_url").eq("show_id", id).maybeSingle()).data
          ?.full_show_thumbnail_url;

  if (!url) return NOT_FOUND;

  const upstream = await fetchPosterImage(url);
  if (!upstream) return NOT_FOUND;

  const webp = await sharp(Buffer.from(await upstream.arrayBuffer()))
    .resize({ width: WIDTH[kind], withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  return new NextResponse(new Uint8Array(webp), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
