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
  position = "center",
}: {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  /**
   * Which part of the image survives the crop, as a CSS object-position.
   * Defaults to centre — only set it where the artwork has a subject that
   * centring cuts badly. The show hero uses "left center": it's a tall box on
   * a phone (420px high against a landscape image), so `cover` trims a lot off
   * both sides, and show artwork tends to put its title graphic on one side.
   */
  position?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      style={{ objectFit: "cover", objectPosition: position }}
    />
  );
}
