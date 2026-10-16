"use client";

import { useEffect, useRef, useState } from 'react';
import MediaLibrary from './MediaLibrary';
import styles from '@/app/(admin)/admin/[slug]/admin.module.css';
import css from './MediaLibrary.module.css';

function PickerDialog({ schoolId, select, close }: { schoolId: string; select: (url: string) => void; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className={css.dialog} onClose={close} aria-label="Choose from media library">
    <div className={css.toolbar}><h2>Choose an image</h2><button type="button" className={styles.secondaryBtn} onClick={close}>Close</button></div>
    <MediaLibrary schoolId={schoolId} onSelect={url => { select(url); close(); }} />
  </dialog>;
}
export default function MediaPicker({ schoolId, onSelect, compact = false }: { schoolId: string; onSelect: (url: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" className={compact ? `${styles.quietBtn} ${css.compactPicker}` : styles.secondaryBtn} onClick={() => setOpen(true)}>{compact ? 'Library' : 'Media library'}</button>
    {open && <PickerDialog schoolId={schoolId} select={onSelect} close={() => setOpen(false)} />}</>;
}
