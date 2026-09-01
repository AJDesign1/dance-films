"use client";

import { useState, useTransition } from "react";
import { saveName } from "@/app/(platform)/welcome/actions";

export default function WelcomeForm() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveName(name);
      // Success redirects server-side; only an error returns here.
      if (res?.status === "error") setError(res.message);
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)" }}>
          One quick thing
        </div>
        <h1
          style={{
            fontFamily: "var(--disp)",
            fontWeight: 800,
            fontSize: 44,
            lineHeight: ".98",
            letterSpacing: ".01em",
            textTransform: "uppercase",
            color: "var(--text)",
            margin: "18px 0 10px",
          }}
        >
          What should we call you?
        </h1>
        <p style={{ margin: "0 0 26px", color: "var(--text-2)", fontSize: 15.5, lineHeight: 1.55 }}>
          We&apos;ll use your name to greet you and on your account.
        </p>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-2)", marginBottom: 9 }}>
          Your name
        </label>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="e.g. Sarah Bailey"
          autoComplete="name"
          autoFocus
          style={{
            width: "100%",
            padding: "15px 16px",
            borderRadius: 10,
            border: "1.5px solid var(--border)",
            background: "var(--surface-2)",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--text)",
            outline: "none",
          }}
        />
        <div style={{ minHeight: 16, marginTop: error ? 9 : 0, fontSize: 12.5, color: "var(--danger)", fontWeight: 600 }}>
          {error ?? ""}
        </div>
        <button
          onClick={submit}
          disabled={pending}
          style={{
            width: "100%",
            marginTop: 14,
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
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
