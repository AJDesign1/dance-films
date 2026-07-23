"use client";

import { useEffect, useRef, useState } from "react";
import { firstName as toFirstName, initials as toInitials } from "@/lib/format";

/**
 * Logged-in account control in the header (replaces any "Sign in" button):
 * shows the parent's name; dropdown has a placeholder "Account" and "Sign out".
 */
export default function AccountMenu({ name, email }: { name: string | null; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 auto" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,255,255,.14)",
          border: "1px solid rgba(255,255,255,.28)",
          borderRadius: "var(--r-pill)",
          padding: "7px 12px 7px 8px",
          cursor: "pointer",
          color: "#fff",
          fontFamily: "var(--body)",
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: "var(--r-pill)",
            background: "rgba(255,255,255,.9)",
            color: "var(--brand-2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {toInitials(name)}
        </span>
        <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>
          {toFirstName(name)}
        </span>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.85 }}>
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 220,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--card-shadow)",
            overflow: "hidden",
            zIndex: 30,
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{name ?? "Your account"}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis" }}>{email}</div>
          </div>
          <button
            disabled
            role="menuitem"
            style={{
              width: "100%",
              textAlign: "left",
              padding: "11px 14px",
              background: "transparent",
              border: "none",
              color: "var(--text-2)",
              fontFamily: "var(--body)",
              fontSize: 14,
              cursor: "not-allowed",
            }}
          >
            Account
          </button>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "11px 14px",
                background: "transparent",
                border: "none",
                borderTop: "1px solid var(--border)",
                color: "var(--text)",
                fontFamily: "var(--body)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
