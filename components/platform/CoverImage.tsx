"use client";

import Image from "next/image";
import { useState } from "react";
import { storageImageLoader } from "@/lib/storageImage";
import { useImageMetadata } from "./ImageMetadata";

/**
 * A photo that fills its (positioned) parent — show artwork, the login hero,
 * the school-page photos, performance thumbnails.
 *
 * Next generates responsive srcsets, but Supabase performs the resizing and
 * delivery directly. SiteGround returns 403 for /_next/image; using the custom
 * loader avoids that route without reverting to full-resolution originals.
 * Local assets and formats Storage cannot transform retain their original URL.
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
  const metadata = useImageMetadata(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return (
    <Image
      loader={storageImageLoader}
      unoptimized={failedSrc === src}
      onError={() => setFailedSrc(src)}
      src={src}
      alt={metadata?.alt_text ?? alt}
      title={metadata?.title || undefined}
      fill
      sizes={sizes}
      priority={priority}
      style={{ objectFit: "cover", objectPosition: position }}
    />
  );
}
