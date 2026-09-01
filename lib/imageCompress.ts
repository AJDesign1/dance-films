/**
 * Shrink an image in the browser before it is uploaded.
 *
 * Everything a school uploads comes off a phone or a camera — the first real
 * show artwork was 1.8MB, and a Bunny poster frame 6MB at 3818px wide. Those
 * were being sent whole, stored whole, and then re-fetched by next/image on
 * the way back out, and anything over the Server Action body cap was simply
 * rejected with "that image is too large" — a dead end for a school admin
 * holding the only copy of the photo they want to use.
 *
 * Resizing here fixes both: the upload succeeds, and what lands in Storage is
 * already the size the site actually renders.
 *
 * Deliberately NOT applied to SVG. Logos are vector, a few KB, and rasterising
 * one would make it permanently blurry — see DECISIONS.md on why SVG logos
 * bypass the image optimiser too. GIFs are also left alone rather than being
 * silently flattened to a single frame.
 */

export const COMPRESS_MAX_EDGE = 2000;
export const COMPRESS_QUALITY = 0.82;

/** Formats where re-encoding would lose something that matters. */
function shouldSkip(file: File): boolean {
  return (
    file.type === "image/svg+xml" ||
    file.type === "image/gif" ||
    !file.type.startsWith("image/")
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns a smaller File, or the original when compressing wouldn't help.
 *
 * Never throws: if anything about the decode or encode fails, the caller gets
 * the original file back and the upload proceeds exactly as it used to. A
 * failed optimisation shouldn't block someone uploading a photo.
 */
export async function compressImage(
  file: File,
  { maxEdge = COMPRESS_MAX_EDGE, quality = COMPRESS_QUALITY }: { maxEdge?: number; quality?: number } = {},
): Promise<File> {
  if (typeof window === "undefined" || shouldSkip(file)) return file;

  try {
    const img = await loadImage(file);
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) return file;

    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const targetW = Math.round(w * scale);
    const targetH = Math.round(h * scale);

    // Already small enough and already a compact format — re-encoding would
    // only lose quality.
    if (scale === 1 && (file.type === "image/webp" || file.type === "image/jpeg")) return file;

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // WebP where the browser supports encoding it, JPEG otherwise. PNG is
    // avoided on purpose — these are photographs, and PNG is the worst
    // possible format for one (DECISIONS.md, on the 1.8MB media-team photo).
    let blob = await toBlob(canvas, "image/webp", quality);
    let type = "image/webp";
    if (!blob) {
      blob = await toBlob(canvas, "image/jpeg", quality);
      type = "image/jpeg";
    }
    if (!blob || blob.size >= file.size) return file; // no gain — keep the original

    const ext = type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
  } catch {
    return file;
  }
}
