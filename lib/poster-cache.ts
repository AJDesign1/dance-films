import "server-only";
import { unstable_cache } from "next/cache";
import sharp from "sharp";
import { fetchPosterImage } from "@/lib/bunny";

/**
 * Cache only image bytes, never the user's entitlement or the HTTP response.
 * The route must authorise every request BEFORE calling this helper.
 * Upload replacements have new UUID URLs, so they naturally get a fresh key.
 * The one-hour TTL also bounds staleness for legacy mutable Bunny URLs.
 */
export const getProcessedPoster = unstable_cache(
  async (url: string, width: number): Promise<string> => {
    const upstream = await fetchPosterImage(url);
    // Throw rather than caching an empty result after a temporary upstream error.
    if (!upstream) throw new Error("Poster source unavailable");
    const webp = await sharp(Buffer.from(await upstream.arrayBuffer()))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    // Next's data cache serialises JSON; Buffer/typed arrays do not round-trip.
    return webp.toString("base64");
  },
  ["processed-poster-webp-v1"],
  { revalidate: 3600 },
);
