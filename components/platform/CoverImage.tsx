import Image from "next/image";

/**
 * A photo that fills its (positioned) parent — show artwork, the login hero,
 * the school-page photos, performance thumbnails.
 *
 * Routed through next/image rather than a raw <img> for two reasons measured on
 * the live site: the originals in Supabase Storage are full-resolution files
 * (the About and media-team photos were 1.8MB each, 2048px wide, displayed at
 * ~550px), and Storage serves them with `Cache-Control: no-cache`, so a raw
 * <img> re-downloaded every one of them on every page view. Next's optimizer
 * resizes to the size actually needed, re-encodes to WebP/AVIF, and serves the
 * result from the CDN with a long-lived cache.
 *
 * `sizes` is required, not optional: without it Next assumes 100vw and fetches
 * a far larger file than a grid card or thumbnail needs.
 */
export default function CoverImage({
  src,
  alt = "",
  sizes,
  priority = false,
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      style={{ objectFit: "cover" }}
    />
  );
}
