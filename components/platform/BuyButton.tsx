"use client";

import { useState } from "react";
import CheckoutModal, { type CheckoutShow } from "@/components/platform/CheckoutModal";
import { formatPrice } from "@/lib/format";

/** Buy CTA for the locked show page — opens the checkout modal. */
export default function BuyButton({ show, email }: { show: CheckoutShow; email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 20px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#fff", fontFamily: "var(--disp)", fontWeight: 700, fontSize: 16, letterSpacing: ".04em", textTransform: "uppercase", cursor: "pointer" }}
      >
        Buy · {formatPrice(show.price_pence)}
      </button>
      {open && <CheckoutModal show={show} email={email} onClose={() => setOpen(false)} />}
    </>
  );
}
