"use client";

import { useState, useTransition, type CSSProperties } from "react";
import { requestMagicLink } from "@/app/(platform)/login/actions";
import { checkAccessCode, redeemAccessCode } from "@/app/(platform)/login/access-code-actions";
import CoverImage from "@/components/platform/CoverImage";
import styles from "./LoginScreen.module.css";

type Props = {
  schoolName: string;
  logoWhiteUrl: string | null;
  heroImageUrl: string | null;
};

type View = "idle" | "sent" | "not_invited" | "code" | "code_email";

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

const linkBtn: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  marginTop: 18,
  background: "none",
  border: "none",
  padding: 0,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-2)",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

export default function LoginScreen({ schoolName, logoWhiteUrl, heroImageUrl }: Props) {
  const [view, setView] = useState<View>("idle");
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await requestMagicLink(email);
      if (res.status === "sent") {
        setSentEmail(res.email);
        setView("sent");
      } else if (res.status === "not_invited") {
        setSentEmail(res.email);
        setView("not_invited");
      } else {
        setError(res.message);
      }
    });
  }

  function submitCode() {
    setCodeError(null);
    startTransition(async () => {
      const res = await checkAccessCode(code);
      if (res.status === "valid") setView("code_email");
      else setCodeError("That code isn't valid. Check with your school and try again.");
    });
  }

  function submitRedeem() {
    setError(null);
    startTransition(async () => {
      const res = await redeemAccessCode(code, email);
      if (res.status === "sent") {
        setSentEmail(res.email);
        setView("sent");
      } else if (res.status === "invalid_code") {
        setCodeError("That code isn't valid anymore.");
        setView("code");
      } else {
        setError(res.message);
      }
    });
  }

  function reset() {
    setView("idle");
    setEmail("");
    setCode("");
    setError(null);
    setCodeError(null);
  }

  function useAccessCode() {
    setError(null);
    setCodeError(null);
    setView("code");
  }

  const accessCodeLink = (
    <button type="button" onClick={useAccessCode} style={linkBtn}>
      Having trouble? Use an access code
    </button>
  );

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

          {view === "idle" && (
            <>
              <h1 style={h1Style}>Welcome back</h1>
              <p style={{ margin: "0 0 26px", color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>
                {schoolName} is invite-only. Enter your email and we&apos;ll send you a secure link to
                sign in — no password to remember.
              </p>
              <label style={labelStyle}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
                placeholder="you@example.com"
                autoComplete="email"
                style={inputStyle}
              />
              <div style={{ minHeight: 16, marginTop: error ? 9 : 0, fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
                {error ?? ""}
              </div>
              <button onClick={submit} disabled={pending} style={{ ...primaryBtn, marginTop: 14, opacity: pending ? 0.7 : 1 }}>
                {pending ? "Sending…" : "Send me a login link"}
                {!pending && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <p style={{ margin: "16px 0 0", display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: "var(--text-2)", lineHeight: 1.5 }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--accent)" strokeWidth="1.5" style={{ flex: "0 0 auto", marginTop: 1 }}>
                  <path d="M8 1.8l5 2v3.4c0 3-2 5.2-5 6.4-3-1.2-5-3.4-5-6.4V3.8l5-2z" strokeLinejoin="round" />
                  <path d="M5.8 8l1.6 1.6L10.4 6.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                No passwords, ever. The link signs you in on this device — we&apos;ll never share your email.
              </p>
              {accessCodeLink}
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
                We&apos;ve sent a login link to <strong style={{ color: "var(--text)" }}>{sentEmail}</strong>. Open it on
                this device to sign in.
              </p>
              <button onClick={reset} style={secondaryBtn}>
                Use a different email
              </button>
              <p style={{ margin: "18px 0 0", textAlign: "center", fontSize: 12.5, color: "var(--text-2)" }}>
                Didn&apos;t get it? Check your spam folder.
              </p>
              {accessCodeLink}
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
                There&apos;s no invitation for <strong style={{ color: "var(--text)" }}>{sentEmail}</strong> yet. {schoolName} is
                invite-only — please contact {schoolName} and we&apos;ll happily add you to the list.
              </p>
              <button onClick={reset} style={primaryBtn}>
                Try another email
              </button>
              <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 10, background: "var(--surface-2)", textAlign: "center" }}>
                <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  Do you have an access code?
                </p>
                <button onClick={useAccessCode} style={secondaryBtn}>
                  Use my access code
                </button>
              </div>
            </>
          )}

          {view === "code" && (
            <>
              <h1 style={h1Style}>Use an access code</h1>
              <p style={{ margin: "0 0 26px", color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>
                If {schoolName} gave you an access code, enter it here to get set up.
              </p>
              <label style={labelStyle}>Access code</label>
              <input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCode();
                }}
                placeholder="e.g. ABCD1234"
                autoCapitalize="characters"
                autoComplete="off"
                style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", letterSpacing: ".08em" }}
              />
              <div style={{ minHeight: 16, marginTop: codeError ? 9 : 0, fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
                {codeError ?? ""}
              </div>
              <button onClick={submitCode} disabled={pending} style={{ ...primaryBtn, marginTop: 14, opacity: pending ? 0.7 : 1 }}>
                {pending ? "Checking…" : "Continue"}
              </button>
              <button onClick={reset} style={secondaryBtn}>
                Back to login
              </button>
            </>
          )}

          {view === "code_email" && (
            <>
              <h1 style={h1Style}>Almost there</h1>
              <p style={{ margin: "0 0 26px", color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>
                Enter your email and we&apos;ll get your account set up and send you a secure sign-in link.
              </p>
              <label style={labelStyle}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitRedeem();
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                style={inputStyle}
              />
              <div style={{ minHeight: 16, marginTop: error ? 9 : 0, fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
                {error ?? ""}
              </div>
              <button onClick={submitRedeem} disabled={pending} style={{ ...primaryBtn, marginTop: 14, opacity: pending ? 0.7 : 1 }}>
                {pending ? "Sending…" : "Send me a login link"}
              </button>
              <button onClick={() => setView("code")} style={secondaryBtn}>
                Back
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
