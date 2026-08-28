"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(platform)/shows/shop.module.css";
import { formatPrice } from "@/lib/format";
import CheckoutModal from "@/components/platform/CheckoutModal";
import CoverImage from "@/components/platform/CoverImage";
import type { ShopShow } from "@/components/platform/ShowCard";

/** "Latest production" hero card. Owned → open show; not owned → open checkout. */
export default function FeaturedShow({ show, email }: { show: ShopShow; email: string }) {
  const router = useRouter();
  const [checkout, setCheckout] = useState(false);

  function activate() {
    if (show.owned) router.push(`/show/${show.slug}`);
    else setCheckout(true);
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            activate();
          }
        }}
        className={styles.featuredCard}
        style={{ display: "block", cursor: "pointer" }}
      >
        <div className={styles.featMinH} style={{ position: "relative", borderRadius: 16, overflow: "hidden", display: "flex", background: "var(--surface-2)", boxShadow: "var(--card-shadow)" }}>
          {show.artwork_url ? (
            // Above the fold on /shows — worth prioritising over lazy-loading.
            <CoverImage src={show.artwork_url} sizes="(max-width: 1360px) 100vw, 1280px" priority position="left center" />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, var(--brand-2), var(--ink))" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(12,20,26,.9) 0%, rgba(12,20,26,.5) 46%, rgba(12,20,26,.05) 82%)", pointerEvents: "none" }} />

          <div className={styles.featPad} style={{ position: "relative", alignSelf: "flex-end", maxWidth: 600 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#fff", opacity: 0.85 }}>
                {show.season ?? "Show"}
                {show.show_year ? ` · ${show.show_year}` : ""}
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.16)", backdropFilter: "blur(4px)", color: "#fff", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", padding: "4px 9px", borderRadius: "var(--r-sm)" }}>
                Video
              </span>
            </div>
            <h2 className={styles.featTitle} style={{ fontFamily: "var(--disp)", fontWeight: 800, lineHeight: ".9", letterSpacing: ".01em", textTransform: "uppercase", color: "#fff", margin: "10px 0 18px" }}>
              {show.title}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
              {show.owned ? (
                <>
                  <span style={cta("var(--accent)", "#fff")}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5V3z" /></svg>Watch the full show
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "#dbe3ea" }}>Yours to rewatch anytime</span>
                </>
              ) : (
                <>
                  <span style={cta("#fff", "var(--ink)")}>
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="6" cy="14" r="1" /><circle cx="13" cy="14" r="1" /><path d="M1 1.5h2l1.8 8.5h8.2l1.4-6H4.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Buy · {formatPrice(show.price_pence)}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: "#dbe3ea" }}>One-time purchase · yours forever</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {checkout && <CheckoutModal show={show} email={email} onClose={() => setCheckout(false)} />}
    </>
  );
}

function cta(bg: string, color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 9,
    padding: "13px 20px",
    borderRadius: 10,
    background: bg,
    color,
    fontFamily: "var(--disp)",
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  };
}
