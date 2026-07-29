"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInWithPassword, requestPasswordReset } from "./actions";
import styles from "./login.module.css";

export default function AdminLoginForm() {
  const [mode, setMode] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submitSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signInWithPassword(email, password);
      if (result?.status === "error") {
        setError(result.message);
        return;
      }
      // Session cookie is set; refresh so the server sees it, then go through.
      router.replace("/admin");
      router.refresh();
    });
  }

  function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await requestPasswordReset(email);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setNotice(result.message);
    });
  }

  if (mode === "reset") {
    return (
      <form onSubmit={submitReset} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="reset-email">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </div>

        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </button>

        {notice ? <p className={styles.sub} style={{ marginTop: 16, marginBottom: 0 }}>{notice}</p> : null}
        {error ? (
          <p className={styles.error} role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => { setMode("signin"); setError(null); setNotice(null); }}
          className={styles.link}
        >
          Back to sign in
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitSignIn} noValidate>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {error ? (
        <p className={styles.error} role="alert">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => { setMode("reset"); setError(null); setNotice(null); }}
        className={styles.link}
      >
        Forgot password?
      </button>
    </form>
  );
}
