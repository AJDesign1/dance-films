"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { requestMagicLink } from "@/app/(platform)/login/actions";
import { redeemAccessCode } from "@/app/(platform)/login/access-code-actions";
import CoverImage from "@/components/platform/CoverImage";
import styles from "./LoginScreen.module.css";

type Props = {
  schoolName: string;
  logoWhiteUrl: string | null;
  heroImageUrl: string | null;
};

type View = "access" | "sent" | "not_invited";

const primaryBtn: CSSProperties = {
  width: "100%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  padding: 15,
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontFamily: "var(--disp)",
  fontWeight: 700,
  fontSize: 18,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  width: "100%",
  marginTop: 10,
  padding: 13,
  borderRadius: 10,
  border: "1.5px solid var(--border)",
  background: "transparent",
  color: "var(--text)",
  fontFamily: "var(--disp)",
  fontWeight: 600,
  fontSize: 15,
  letterSpacing: ".03em",
  textTransform: "uppercase",
  cursor: "pointer",
};

const h1Style: CSSProperties = {
  fontFamily: "var(--disp)",
  fontWeight: 800,
  fontSize: 44,
  lineHeight: ".98",
  letterSpacing: ".01em",
  textTransform: "uppercase",
  color: "var(--text)",
  margin: "18px 0 10px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: 10,
  border: "1.5px solid var(--border)",
  background: "var(--surface-2)",
  fontSize: 16,
  fontWeight: 500,
  color: "var(--text)",
  outline: "none",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: "var(--text-2)",
  marginBottom: 9,
};

export default function LoginScreen({ schoolName, logoWhiteUrl, heroImageUrl }: Props) {
  const [view, setView] = useState<View>("access");
  const [accessEmail, setAccessEmail] = useState("");
  const [returningEmail, setReturningEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [sentFromAccessCode, setSentFromAccessCode] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"access" | "magic" | null>(null);
  const [pending, startTransition] = useTransition();
  const displaySchoolName = schoolName.replace(/\s+Company$/i, "");

  function submitMagicLink() {
    setMagicLinkError(null);
    setPendingAction("magic");
    startTransition(async () => {
      try {
        const res = await requestMagicLink(returningEmail);
        if (res.status === "sent") {
          setSentEmail(res.email);
          setSentFromAccessCode(false);
          setView("sent");
        } else if (res.status === "not_invited") {
          setSentEmail(res.email);
          setView("not_invited");
        } else {
          setMagicLinkError(res.message);
        }
      } finally {
        setPendingAction(null);
      }
    });
  }

  function submitAccessCode() {
    setCodeError(null);
    setAccessError(null);
    setPendingAction("access");
    startTransition(async () => {
      try {
        const res = await redeemAccessCode(code, accessEmail);
        if (res.status === "sent") {
          setSentEmail(res.email);
          setSentFromAccessCode(true);
          setView("sent");
        } else if (res.status === "invalid_code") {
          setCodeError("That code isn't valid. Check it and try again.");
        } else {
          setAccessError(res.message);
        }
      } finally {
        setPendingAction(null);
      }
    });
  }

  function reset() {
    setView("access");
    setAccessEmail("");
    setReturningEmail("");
    setCode("");
    setAccessError(null);
    setMagicLinkError(null);
    setCodeError(null);
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        minHeight: "100vh",
        animation: "fadeUp .5s ease both",
      }}
    >
      {/* Hero panel */}
      <div className={styles.hero}>
        {heroImageUrl ? (
          // The first thing a parent sees — prioritised, not lazy-loaded.
          <CoverImage src={heroImageUrl} sizes="(max-width: 760px) 100vw, 50vw" priority />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(140deg, var(--brand-2) 0%, var(--accent) 120%)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(15,26,34,.5) 0%, rgba(15,26,34,.05) 32%, rgba(15,26,34,.72) 100%)",
            pointerEvents: "none",
          }}
        />
        {logoWhiteUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoWhiteUrl} alt={schoolName} className={styles.heroLogoImg} />
        ) : (
          <div className={styles.heroLogoText}>{schoolName}</div>
        )}
        <div className={styles.heroContent}>
          <div className={styles.heroTitle}>Relive the show, whenever you like.</div>
          <p className={styles.heroSubtitle}>
            Sign in to watch your dance school&apos;s professionally filmed performances — the full show and every dance.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div
        className={styles.formPanel}
        style={{
          flex: "1 1 360px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "44px 34px",
          background: "var(--surface)",
        }}
      >
        <div style={{ width: "100%", maxWidth: 372 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)" }}>
            {schoolName}
          </div>

          {view === "access" && (
            <>
              <h1 style={{ ...h1Style, fontSize: "clamp(35px, 8vw, 44px)" }}>
                Access your {displaySchoolName} videos
              </h1>
              <p style={{ margin: "0 0 26px", color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>
                Enter the email address you want to use and the access code from {schoolName}.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submitAccessCode();
                }}
              >
                <label htmlFor="access-email" style={labelStyle}>Email address</label>
                <input
                  id="access-email"
                  name="email"
                  type="email"
                  value={accessEmail}
                  onChange={(event) => {
                    setAccessEmail(event.target.value);
                    setAccessError(null);
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={inputStyle}
                />
                <label htmlFor="access-code" style={{ ...labelStyle, marginTop: 18 }}>Access code</label>
                <input
                  id="access-code"
                  name="access-code"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setCodeError(null);
                  }}
                  placeholder="e.g. ABCD1234"
                  autoCapitalize="characters"
                  autoComplete="one-time-code"
                  required
                  style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", letterSpacing: ".08em" }}
                />
                <div aria-live="polite" style={{ minHeight: 16, marginTop: codeError || accessError ? 9 : 0, fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
                  {codeError ?? accessError ?? ""}
                </div>
                <button type="submit" disabled={pending} style={{ ...primaryBtn, marginTop: 14, opacity: pending ? 0.7 : 1 }}>
                  {pendingAction === "access" ? "Sending…" : "View videos"}
                  {pendingAction !== "access" && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </form>

              <section className={styles.returningUsers} aria-labelledby="returning-users-heading">
                <h2 id="returning-users-heading" className={styles.returningTitle}>Already registered?</h2>
                <p className={styles.returningCopy}>
                  Enter your email address and we&apos;ll send you a secure magic link.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitMagicLink();
                  }}
                >
                  <label htmlFor="returning-email" style={labelStyle}>Email address</label>
                  <input
                    id="returning-email"
                    name="returning-email"
                    type="email"
                    value={returningEmail}
                    onChange={(event) => {
                      setReturningEmail(event.target.value);
                      setMagicLinkError(null);
                    }}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    style={inputStyle}
                  />
                  <div aria-live="polite" style={{ minHeight: 16, marginTop: magicLinkError ? 9 : 0, fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
                    {magicLinkError ?? ""}
                  </div>
                  <button type="submit" disabled={pending} style={{ ...secondaryBtn, opacity: pending ? 0.7 : 1 }}>
                    {pendingAction === "magic" ? "Sending…" : "Send magic link"}
                  </button>
                </form>
              </section>
            </>
          )}

          {view === "sent" && (
            <>
              <div style={{ marginTop: 20, width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--accent-tint)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3.5 6.5L12 12l8.5-5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 style={{ ...h1Style, fontSize: 40 }}>Check your inbox</h1>
              <p style={{ margin: "0 0 24px", color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>
                {sentFromAccessCode ? "Your access is ready. We’ve" : "We’ve"} sent a secure login link to{" "}
                <strong style={{ color: "var(--text)" }}>{sentEmail}</strong>. Open it on this device to view your videos.
              </p>
              <button onClick={reset} style={secondaryBtn}>
                Use a different email
              </button>
              <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 12.5, color: "var(--text-2)" }}>
                Didn&apos;t get it? Check your spam folder.
              </p>
            </>
          )}

          {view === "not_invited" && (
            <>
              <div style={{ marginTop: 20, width: 56, height: 56, borderRadius: "var(--r-lg)", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--text-2)" strokeWidth="1.7">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7.5v5" strokeLinecap="round" />
                  <circle cx="12" cy="16" r=".8" fill="var(--text-2)" stroke="none" />
                </svg>
              </div>
              <h1 style={{ ...h1Style, fontSize: 38 }}>We can&apos;t find your invitation</h1>
              <p style={{ margin: "0 0 24px", color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>
                There&apos;s no registration for <strong style={{ color: "var(--text)" }}>{sentEmail}</strong> yet. If this is
                your first visit, use the access code from {schoolName}.
              </p>
              <button onClick={reset} style={primaryBtn}>
                Use an access code
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
