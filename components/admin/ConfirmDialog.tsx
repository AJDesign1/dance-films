"use client";

import { useEffect, useState } from "react";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";

/**
 * Confirmation for destructive admin actions.
 *
 * Replaces window.confirm, which is easy to dismiss on reflex and can't show
 * what is actually about to be destroyed. For the genuinely irreversible cases
 * (deleting a school or a show, which cascade into parents' access) pass
 * `confirmPhrase`: the button stays disabled until the admin types the name,
 * so it can't be triggered by a stray click on the wrong row.
 */
export default function ConfirmDialog({
  open,
  title,
  body,
  consequences,
  confirmLabel = "Delete",
  confirmPhrase,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  /** Bullet list of what this destroys — shown verbatim. */
  consequences?: string[];
  confirmLabel?: string;
  /** When set, the admin must type this exactly before confirming. */
  confirmPhrase?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");

  // Reset the typed phrase whenever the dialog opens, so a previous
  // confirmation can't leave it pre-filled for a different row.
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const ready = !confirmPhrase || typed.trim() === confirmPhrase.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => !busy && onCancel()}
      style={{
        position: "fixed", inset: 0, zIndex: 200, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
        background: "rgba(12,20,26,.62)", backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={styles.card}
        style={{ width: "100%", maxWidth: 460, padding: 24 }}
      >
        <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: "var(--text)" }}>
          {title}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.55, color: "var(--text-2)" }}>{body}</p>

        {consequences && consequences.length > 0 && (
          <ul style={{ margin: "14px 0 0", padding: "0 0 0 18px", fontSize: 13.5, lineHeight: 1.7, color: "var(--text-2)" }}>
            {consequences.map((c) => <li key={c}>{c}</li>)}
          </ul>
        )}

        {confirmPhrase && (
          <>
            <label className={styles.fieldLabel}>
              Type <strong style={{ color: "var(--text)" }}>{confirmPhrase}</strong> to confirm
            </label>
            <input
              className={styles.input}
              value={typed}
              autoFocus
              placeholder={confirmPhrase}
              onChange={(e) => setTyped(e.target.value)}
            />
          </>
        )}

        {error && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--danger, #B4232A)" }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button className={styles.secondaryBtn} disabled={busy} onClick={onCancel}>Cancel</button>
          <button
            className={styles.dangerBtn}
            disabled={busy || !ready}
            style={!ready || busy ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            onClick={onConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
