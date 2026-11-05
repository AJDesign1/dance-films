"use client";

import { useEffect, useRef } from "react";
import styles from "@/app/(platform)/shows/shop.module.css";

export default function ComingSoonModal({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={dialog} className={styles.comingSoonDialog} aria-labelledby="coming-soon-title"
      onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.comingSoonBody}>
        <h2 id="coming-soon-title">Coming Soon</h2>
        <p>This show will be available to purchase soon.</p>
        <button autoFocus onClick={onClose}>Close</button>
      </div>
    </dialog>
  );
}
