"use client";

/**
 * Confirmation shown before a full-show download starts (never before
 * streaming). Informative, not a hard gate — the download proceeds the
 * moment the customer confirms; this just states the personal/family-use
 * terms up front. Visual shell matches CheckoutModal for consistency.
 */
export default function DownloadConfirmModal({
  title,
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(9,15,20,.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "ovIn .28s ease both" }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-confirm-heading"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: "var(--surface)", borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 90px -24px rgba(0,0,0,.6)", animation: "ovUp .3s ease both" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <div id="download-confirm-heading" style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 22, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--text)" }}>
            Download this video?
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>×</button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)", marginBottom: 16 }}>
            {title}
          </div>

          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--text)" }}>
            This video is licensed for <strong>personal and family use only</strong>. Please
            don&rsquo;t share, redistribute or upload the video publicly.
          </p>
          <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--text-2)" }}>
            By downloading, you agree to these terms.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              onClick={onClose}
              style={{ flex: "1 1 0", padding: "13px 16px", borderRadius: 10, border: "1.5px solid var(--border)", background: "transparent", color: "var(--text)", fontFamily: "var(--body)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={pending}
              style={{ flex: "1 1 0", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontFamily: "var(--body)", fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: pending ? 0.7 : 1 }}
            >
              {pending ? "Preparing…" : "Download Video"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
