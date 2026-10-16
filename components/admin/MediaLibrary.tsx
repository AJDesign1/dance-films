"use client";

import { useEffect, useRef, useState, useTransition } from 'react';
import { listMedia, saveMedia, uploadMedia, type MediaAsset, type MediaFields } from '@/app/(admin)/admin/[slug]/media/actions';
import { compressImage } from '@/lib/imageCompress';
import { MAX_ARTWORK_BYTES, isRedirectError, tooLargeMessage } from '@/lib/uploads';
import { storageImageSrc } from '@/lib/storageImage';
import styles from '@/app/(admin)/admin/[slug]/admin.module.css';
import css from './MediaLibrary.module.css';

export default function MediaLibrary({ schoolId, onSelect }: { schoolId: string; onSelect?: (url: string) => void }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [search, setSearch] = useState('');
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const request = useRef(0);

  async function load(offset = 0) {
    const serial = ++request.current;
    setLoading(true);
    try {
      const result = await listMedia(schoolId, search, offset);
      if (serial !== request.current) return;
      if ('error' in result) { setMessage(result.error); return; }
      setAssets(previous => offset ? [...previous, ...result.assets] : result.assets);
      setMore(result.more);
    } catch (e) {
      if (isRedirectError(e)) throw e;
      if (serial === request.current) setMessage('Could not load images. Please try again.');
    } finally { if (serial === request.current) setLoading(false); }
  }
  useEffect(() => {
    const timer = setTimeout(() => { setSelected(null); void load(); }, 250);
    return () => { clearTimeout(timer); request.current++; };
    // Each search starts a fresh, server-filtered page; stale replies are ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId, search]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setMessage('');
    try {
      for (const file of Array.from(files)) {
        const image = await compressImage(file);
        if (image.size > MAX_ARTWORK_BYTES) throw new Error(tooLargeMessage(MAX_ARTWORK_BYTES));
        const form = new FormData(); form.set('file', image);
        const result = await uploadMedia(schoolId, form);
        if ('error' in result) throw new Error(result.error);
      }
      setSearch(''); await load(); setMessage('Images uploaded. Select one to edit its details.');
    } catch (e) {
      if (isRedirectError(e)) throw e;
      setMessage(e instanceof Error ? e.message : 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  }

  return <div className={css.library}>
    <p>Upload once and reuse across this school. Existing uploads are included; changing details does not change their URLs.</p>
    <div className={css.toolbar}>
      <label className={css.search}>Search images<input className={styles.input} type="search" value={search} maxLength={200} onChange={e => setSearch(e.target.value)} placeholder="Title, filename or alt text" /></label>
      <label className={styles.primaryBtn}>{uploading ? 'Uploading…' : 'Add images'}<input type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" disabled={uploading} className={css.file} onChange={e => { void upload(e.target.files); e.target.value = ''; }} /></label>
    </div>
    <p role="status" aria-live="polite">{message || (loading ? 'Loading images…' : `${assets.length} images shown`)}</p>
    <div className={css.layout}>
      <div>
        <div className={css.grid} aria-label="Images">
          {assets.map(asset => <button type="button" key={asset.id} aria-pressed={selected?.id === asset.id} className={css.tile} onClick={() => setSelected(asset)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={storageImageSrc(asset.url, 320)} alt="" loading="lazy" /><span>{asset.title || asset.filename}</span>
          </button>)}
        </div>
        {!loading && !assets.length && <p>No images found. Add an image or change your search.</p>}
        {more && <button className={styles.secondaryBtn} disabled={loading} onClick={() => void load(assets.length)}>Load more</button>}
      </div>
      {selected && <MediaDetails key={selected.id} asset={selected} schoolId={schoolId} onSelect={onSelect} onSaved={fields => {
        setSelected(previous => previous && { ...previous, ...fields });
        setAssets(previous => previous.map(a => a.id === selected.id ? { ...a, ...fields } : a));
      }} />}
    </div>
  </div>;
}

function MediaDetails({ asset, schoolId, onSelect, onSaved }: { asset: MediaAsset; schoolId: string; onSelect?: (url: string) => void; onSaved: (fields: MediaFields) => void }) {
  const [fields, setFields] = useState<MediaFields>({ title: asset.title, alt_text: asset.alt_text, caption: asset.caption, description: asset.description });
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(fields) !== JSON.stringify({ title: asset.title, alt_text: asset.alt_text, caption: asset.caption, description: asset.description });
  const set = (key: keyof MediaFields, value: string | null) => setFields(previous => ({ ...previous, [key]: value }));
  return <section className={`${styles.card} ${styles.cardPad} ${css.details}`} aria-label="Image details">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className={css.preview} src={storageImageSrc(asset.url, 640)} alt={fields.alt_text ?? ''} />
    <p className={css.filename}>{asset.filename}</p>
    <label className={styles.fieldLabel}>Title<input className={styles.input} value={fields.title} maxLength={200} onChange={e => set('title', e.target.value)} /></label>
    <label className={styles.fieldLabel}>Alternative text<textarea className={styles.textarea} rows={3} value={fields.alt_text ?? ''} maxLength={500} disabled={fields.alt_text === ''} onChange={e => set('alt_text', e.target.value || null)} /></label>
    <label><input type="checkbox" checked={fields.alt_text === ''} onChange={e => set('alt_text', e.target.checked ? '' : null)} /> Decorative image (empty alt text)</label>
    <p>Describe what the image shows for screen readers. Leave unset to use the page’s existing alternative text. Avoid keyword stuffing.</p>
    <label className={styles.fieldLabel}>Caption<textarea className={styles.textarea} rows={2} value={fields.caption} maxLength={2000} onChange={e => set('caption', e.target.value)} /></label>
    <label className={styles.fieldLabel}>Description<textarea className={styles.textarea} rows={3} value={fields.description} maxLength={5000} onChange={e => set('description', e.target.value)} /></label>
    <p>Title and alt text are applied to supported page images. Captions and descriptions are stored in the library; they do not add visible text to existing layouts. Parent video pages remain sign-in protected.</p>
    <button type="button" className={styles.primaryBtn} disabled={pending || !dirty} onClick={() => startTransition(async () => {
      setMessage('');
      try {
        const result = await saveMedia(schoolId, asset.id, fields);
        if ('error' in result) setMessage(result.error ?? 'Could not save.');
        else { onSaved(fields); setMessage('Image details saved.'); }
      } catch (e) { if (isRedirectError(e)) throw e; setMessage('Could not save. Please try again.'); }
    })}>{pending ? 'Saving…' : 'Save details'}</button>
    {onSelect && <button type="button" className={styles.secondaryBtn} disabled={pending || dirty} onClick={() => onSelect(asset.url)}>Use this image</button>}
    {dirty && onSelect && <p>Save details before choosing this image.</p>}
    <p role="status">{message}</p>
    <a href={asset.url} target="_blank" rel="noreferrer">Open original image</a>
  </section>;
}
