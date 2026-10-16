"use server";

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { MEDIA_CACHE_TAG } from '@/lib/media';
import { SCHOOLS_CACHE_TAG } from '@/lib/school';
import { uploadShowArtwork } from '../shows/actions';
import type { Database } from '@/lib/supabase/database.types';

export type MediaAsset = Database['public']['Tables']['media_assets']['Row'] & { url: string };
export type MediaFields = Pick<MediaAsset, 'title' | 'alt_text' | 'caption' | 'description'>;

async function managedSchool(schoolId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin.from('schools').select('id, slug').eq('id', schoolId).maybeSingle();
  if (error || !data) throw new Error('School not found.');
  return { admin, school: data };
}

export async function listMedia(schoolId: string, search = '', offset = 0): Promise<{ assets: MediaAsset[]; more: boolean } | { error: string }> {
  const { admin } = await managedSchool(schoolId);
  if (!Number.isSafeInteger(offset) || offset < 0 || search.length > 200) return { error: 'Invalid library request.' };
  let query = admin.from('media_assets').select('*').eq('school_id', schoolId)
    .order('created_at', { ascending: false }).order('id').range(offset, offset + 47);
  const term = search.replace(/[^\p{L}\p{N} .-]/gu, '').trim();
  if (term) query = query.or(`title.ilike.%${term}%,filename.ilike.%${term}%,alt_text.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) return { error: 'Could not load the media library. Please try again.' };
  return { assets: (data ?? []).map(row => ({ ...row, url: admin.storage.from(row.bucket).getPublicUrl(row.storage_path).data.publicUrl })), more: data?.length === 48 };
}

export async function saveMedia(schoolId: string, id: string, fields: MediaFields) {
  const { admin, school } = await managedSchool(schoolId);
  if (typeof fields.title !== 'string' || typeof fields.caption !== 'string' || typeof fields.description !== 'string' ||
      (fields.alt_text !== null && typeof fields.alt_text !== 'string')) return { error: 'Invalid image details.' };
  const clean = { title: fields.title.trim(), alt_text: fields.alt_text?.trim() ?? null, caption: fields.caption.trim(), description: fields.description.trim() };
  if (!clean.title || clean.title.length > 200 || (clean.alt_text?.length ?? 0) > 500 || clean.caption.length > 2000 || clean.description.length > 5000) return { error: 'Add a title and keep the details within their displayed limits.' };
  const { data, error } = await admin.from('media_assets').update(clean).eq('school_id', schoolId).eq('id', id).select('id').maybeSingle();
  if (error || !data) return { error: 'Could not save this image.' };
  revalidateTag(MEDIA_CACHE_TAG);
  revalidateTag(SCHOOLS_CACHE_TAG);
  revalidatePath(`/entry/${school.slug}`);
  revalidatePath(`/admin/${school.slug}/media`);
  return { ok: true as const };
}

export async function uploadMedia(schoolId: string, formData: FormData) {
  await managedSchool(schoolId);
  return uploadShowArtwork(schoolId, formData);
}

export async function choosePerformanceMedia(schoolId: string, showId: string, performanceId: string, url: string) {
  const { admin, school } = await managedSchool(schoolId);
  const { data: show } = await admin.from('shows').select('id').eq('id', showId).eq('school_id', schoolId).maybeSingle();
  if (!show) return { error: 'Show not found.' };
  const { storageReference } = await import('@/lib/media');
  const ref = storageReference(url);
  if (!ref) return { error: 'Choose an image from this school’s library.' };
  const { data: asset } = await admin.from('media_assets').select('id').eq('school_id', schoolId).eq('bucket', ref.bucket).eq('storage_path', ref.path).maybeSingle();
  if (!asset) return { error: 'Choose an image from this school’s library.' };
  const { data, error } = await admin.from('performances').update({ thumbnail_url: url }).eq('show_id', showId).eq('id', performanceId).select('id').maybeSingle();
  if (error || !data) return { error: 'Could not change this performance’s image.' };
  revalidatePath(`/admin/${school.slug}/performances`);
  revalidatePath('/show/[slug]', 'page');
  return { ok: true as const };
}
