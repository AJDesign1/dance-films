"use client";

import { useState, useTransition } from "react";
import { createCheckoutSession } from "@/app/(platform)/checkout/actions";
import { formatPrice } from "@/lib/format";

export type CheckoutShow = {
  slug: string;
  title: string;
  show_year: number | null;
  price_pence: number;
};

/**
 * Branded order-summary modal → Stripe hosted Checkout. We never collect card
 * details in-app; "Pay" creates the Checkout Session server-side and redirects
 * to Stripe's PCI-compliant page.
 */
export default function CheckoutModal({
  show,
  email,
  onClose,
}: {
  show: CheckoutShow;
  email: string;
  onClose: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pay() {
    setError(null);
    startTransition(async () => {
      const res = await createCheckoutSession(show.slug);
      if ("url" in res) {
        window.location.href = res.url;
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(9,15,20,.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "ovIn .28s ease both" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: "var(--surface)", borderRadius: 16, overflow: "hidden", boxShadow: "0 40px 90px -24px rgba(0,0,0,.6)", animation: "ovUp .3s ease both" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 22px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 22, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--text)" }}>
            Checkout
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", border: "1px solid var(--border)", background: "transparent", color: "var(--text)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: 22 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ flex: "0 0 auto", width: 58, aspectRatio: "3 / 4", borderRadius: "var(--r-sm)", overflow: "hidden", background: "linear-gradient(160deg, var(--brand-2), var(--ink))" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--text)", lineHeight: 1 }}>
                {show.title}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 5 }}>
                {show.show_year ? `${show.show_year} · ` : ""}Full show + all performances
              </div>
            </div>
            <div style={{ marginLeft: "auto", fontFamily: "var(--disp)", fontWeight: 700, fontSize: 24, color: "var(--text)" }}>
              {formatPrice(show.price_pence)}
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: 8 }}>
            Email
          </label>
          <div style={{ padding: "13px 15px", borderRadius: 10, border: "1.5px solid var(--border)", background: "var(--surface-2)", fontSize: 15, color: "var(--text)", fontWeight: 500 }}>
            {email}
          </div>

          {error && (
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>{error}</div>
          )}

          <button
            onClick={pay}
            disabled={pending}
            style={{ width: "100%", marginTop: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9, padding: 15, borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontFamily: "var(--disp)", fontWeight: 700, fontSize: 18, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer", opacity: pending ? 0.7 : 1 }}
          >
            {pending ? "Redirecting…" : `Pay ${formatPrice(show.price_pence)}`}
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 14, fontSize: 11.5, color: "var(--text-2)" }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="7" width="10" height="7" rx="1.5" /><path d="M5 7V5a3 3 0 016 0v2" /></svg>
            Secure payment by <span style={{ fontWeight: 700, color: "var(--text)" }}>Stripe</span>
          </div>
        </div>
      </div>
    </div>
  );
}
