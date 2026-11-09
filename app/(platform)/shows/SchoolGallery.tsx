"use client";

import { useEffect, useRef, useState } from "react";
import CoverImage from "@/components/platform/CoverImage";
import { useImageMetadata } from "@/components/platform/ImageMetadata";
import styles from "./shop.module.css";

function GalleryLightbox({ images, initialIndex, schoolName, onClose }: {
  images: string[]; initialIndex: number; schoolName: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(initialIndex);
  const metadata = useImageMetadata(images[index]);
  const move = (delta: number) => setIndex(i => (i + delta + images.length) % images.length);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog ref={dialog} className={styles.galleryLightbox} aria-label={`${schoolName} — Behind the Scenes`}
      onClose={onClose} onCancel={onClose}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={event => {
        if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      }}>
      <div className={styles.lightboxToolbar}>
        <span aria-live="polite">{index + 1} / {images.length}</span>
        <button type="button" autoFocus onClick={onClose}>Close</button>
      </div>
      <div className={styles.lightboxImage}>
        <CoverImage key={images[index]} src={images[index]} alt={`${schoolName} behind the scenes, photo ${index + 1}`} sizes="95vw" />
      </div>
      <div className={styles.lightboxToolbar}>
        {images.length > 1 && <button type="button" onClick={() => move(-1)} aria-label="Previous photo">← Previous</button>}
        {metadata?.title && <span className={styles.lightboxCaption}>{metadata.title}</span>}
        {images.length > 1 && <button type="button" onClick={() => move(1)} aria-label="Next photo">Next →</button>}
      </div>
    </dialog>
  );
}

export default function SchoolGallery({ images, schoolName }: { images: string[]; schoolName: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const available = images.filter(Boolean).slice(0, 6);
  function closeGallery() {
    const trigger = buttons.current[selected ?? 0];
    setSelected(null);
    // The dialog is removed before returning keyboard focus to its opener.
    requestAnimationFrame(() => trigger?.focus());
  }
  if (!available.length) return null;
  return (
    <section className={styles.behindScenes} aria-labelledby="behind-scenes-title">
      <h2 id="behind-scenes-title" className={styles.galleryTitle}>Behind the Scenes</h2>
      <div className={styles.galleryGrid}>
        {available.map((src, index) => (
          <button type="button" key={src} className={styles.galleryTile} ref={element => { buttons.current[index] = element; }}
            aria-label={`Open ${schoolName} behind the scenes photo ${index + 1}`} onClick={() => setSelected(index)}>
            <CoverImage src={src} sizes="(max-width: 540px) 100vw, (max-width: 900px) 50vw, 400px" />
            <span className={styles.galleryOpen} aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {selected !== null && <GalleryLightbox images={available} initialIndex={selected} schoolName={schoolName} onClose={closeGallery} />}
    </section>
  );
}
