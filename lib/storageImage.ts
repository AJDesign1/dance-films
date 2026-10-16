/** Host-independent delivery: never sends Storage photos to /_next/image. */
export function storageImageSrc(src: string, width: number, quality = 78): string {
  try {
    const url = new URL(src);
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!configured || url.origin !== new URL(configured).origin ||
        !url.pathname.startsWith('/storage/v1/object/public/') ||
        !/\.(webp|jpe?g|png)$/i.test(url.pathname)) return src;
    url.pathname = url.pathname.replace('/object/public/', '/render/image/public/');
    // A square bounding box with contain preserves both portrait and landscape
    // proportions. CSS object-fit performs the final, existing layout crop.
    const edge = Math.max(1, Math.min(2500, Math.round(width)));
    url.searchParams.set('width', String(edge));
    url.searchParams.set('height', String(edge));
    url.searchParams.set('resize', 'contain');
    url.searchParams.set('quality', String(quality));
    return url.toString();
  } catch { return src; }
}

export function storageImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return storageImageSrc(src, width, quality);
}
