import 'server-only';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ImageMetadataMap } from '@/components/platform/ImageMetadata';

export const MEDIA_CACHE_TAG = 'media-metadata';

export function storageReference(url: string) {
  try {
    const u = new URL(url);
    if (u.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin) return null;
    const match = u.pathname.match(/^\/storage\/v1\/object\/public\/(branding|artwork)\/(.+)$/);
    return match ? { bucket: match[1], path: decodeURIComponent(match[2]) } : null;
  } catch { return null; }
}

/** Call ONLY with URLs already authorised for the page being rendered. No
 * catalogue, captions, descriptions, or unused uploads reach parent markup. */
export const imageMetadata = unstable_cache(async (schoolId: string, urls: string[]): Promise<ImageMetadataMap> => {
  const refs = urls.map(url => ({ url, ref: storageReference(url) })).filter(r => r.ref?.path.startsWith(`${schoolId}/`));
  if (!refs.length) return {};
  const { data, error } = await createAdminClient().from('media_assets')
    .select('bucket, storage_path, title, alt_text').eq('school_id', schoolId)
    .in('storage_path', refs.map(r => r.ref!.path));
  // Allows the image-delivery fix to run before the additive migration lands.
  if (error) return {};
  const map: ImageMetadataMap = {};
  for (const r of refs) {
    const row = data?.find(d => d.bucket === r.ref!.bucket && d.storage_path === r.ref!.path);
    if (row) map[r.url] = { title: row.title, alt_text: row.alt_text };
  }
  return map;
}, ['in-use-image-metadata'], { tags: [MEDIA_CACHE_TAG], revalidate: 300 });

export async function registerMedia(schoolId: string, bucket: 'branding' | 'artwork', path: string, filename: string) {
  const { error } = await createAdminClient().from('media_assets').upsert({
    school_id: schoolId, bucket, storage_path: path, filename,
    title: filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 200),
  }, { onConflict: 'bucket,storage_path', ignoreDuplicates: true });
  if (error) throw new Error('The image uploaded, but its library entry could not be saved.');
}
