"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(platform)/shows/shop.module.css";
import { formatPrice } from "@/lib/format";
import CheckoutModal from "@/components/platform/CheckoutModal";
import CoverImage from "@/components/platform/CoverImage";

export type ShopShow = {
  slug: string;
  title: string;
  show_year: number | null;
  season: string | null;
  price_pence: number;
  artwork_url: string | null;
  owned: boolean;
};

/** Grid poster card (3:4). Owned → open show; not owned → open checkout. */
export default function ShowCard({ show, email }: { show: ShopShow; email: string }) {
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
        className={styles.cardLink}
      >
        <div style={{ position: "relative", aspectRatio: "3 / 4", borderRadius: 12, overflow: "hidden", background: "var(--surface-2)", boxShadow: "var(--card-shadow)" }}>
          {show.artwork_url ? (
            <CoverImage src={show.artwork_url} sizes="(max-width: 900px) 50vw, 400px" position="left center" />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, var(--brand-2), var(--ink))" }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(12,20,26,0) 42%,rgba(12,20,26,.88) 100%)", pointerEvents: "none" }} />

          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 5, pointerEvents: "none" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(12,20,26,.72)", backdropFilter: "blur(3px)", color: "#fff", fontSize: 9.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", padding: "4px 7px", borderRadius: "var(--r-sm)" }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5V3z" /></svg>Video
            </span>
          </div>

          {show.owned && (
            <span style={{ position: "absolute", top: 10, left: 10, display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.94)", color: "var(--success)", fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", padding: "5px 9px", borderRadius: 7, pointerEvents: "none" }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" /></svg>Owned
            </span>
          )}

          <div style={{ position: "absolute", left: 13, right: 13, bottom: 18, pointerEvents: "none" }}>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 38, letterSpacing: ".01em", textTransform: "uppercase", color: "#fff", lineHeight: ".98" }}>
              {show.title}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#fff" }}>
                {show.show_year ? `${show.show_year} · ` : ""}
                {formatPrice(show.price_pence)}
              </span>
              {show.owned ? (
                <span style={pill("var(--accent)", "#fff")}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M4 3l9 5-9 5V3z" /></svg>Watch
                </span>
              ) : (
                <span style={pill("#fff", "var(--ink)")}>
                  <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="14" r="1" /><circle cx="13" cy="14" r="1" /><path d="M1 1.5h2l1.8 8.5h8.2l1.4-6H4.2" strokeLinecap="round" strokeLinejoin="round" /></svg>Buy
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {checkout && <CheckoutModal show={show} email={email} onClose={() => setCheckout(false)} />}
    </>
  );
}

function pill(bg: string, color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 12px",
    borderRadius: "var(--r-sm)",
    background: bg,
    color,
    fontFamily: "var(--disp)",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: ".03em",
    textTransform: "uppercase",
  };
}
