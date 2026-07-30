"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import {
  createAccessCode, regenerateAccessCode, updateAccessCodeShow, toggleAccessCodeStatus, removeAccessCode,
} from "@/app/(admin)/admin/[slug]/access-codes/actions";

export type AccessCodeRow = {
  id: string;
  code: string;
  status: "active" | "disabled";
  showId: string | null;
  showTitle: string | null;
};
type ShowOpt = { id: string; title: string };

export default function AccessCodesManager({
  schoolId,
  slug,
  codes,
  shows,
}: {
  schoolId: string;
  slug: string;
  codes: AccessCodeRow[];
  shows: ShowOpt[];
}) {
  const router = useRouter();
  const [newShowId, setNewShowId] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok?: boolean; error?: string }>) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setMsg(res.error);
      router.refresh();
    });
  }

  function copy(id: string, code: string) {
    navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
      {/* List */}
      <div className={styles.card} style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 100px 230px", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          <span>Code</span><span>Show</span><span>Status</span><span></span>
        </div>
        {codes.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>No access codes yet</div>
            <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>
              Create one on the right — a simple way in for a parent who isn&apos;t invited yet, or is having trouble with the magic-link email.
            </p>
          </div>
        ) : (
          codes.map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "150px 1fr 100px 230px", gap: 12, alignItems: "center", padding: "13px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, fontWeight: 700, letterSpacing: ".04em" }}>{c.code}</div>
              <select
                className={styles.select}
                style={{ padding: "7px 8px", fontSize: 13 }}
                disabled={pending}
                defaultValue={c.showId ?? ""}
                onChange={(e) => run(() => updateAccessCodeShow(c.id, slug, e.target.value || null))}
              >
                <option value="">Whole school</option>
                {shows.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
              <span className={`${styles.badge} ${c.status === "active" ? styles.badgeOk : styles.badgeMuted}`}>
                {c.status === "active" ? "Active" : "Disabled"}
              </span>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                <button className={styles.quietBtn} onClick={() => copy(c.id, c.code)}>{copiedId === c.id ? "Copied" : "Copy"}</button>
                <button className={styles.quietBtn} disabled={pending} onClick={() => run(() => regenerateAccessCode(c.id, slug))}>Regenerate</button>
                <button className={styles.quietBtn} disabled={pending} onClick={() => run(() => toggleAccessCodeStatus(c.id, slug, c.status === "active" ? "disabled" : "active"))}>
                  {c.status === "active" ? "Disable" : "Enable"}
                </button>
                <button className={styles.dangerBtn} disabled={pending} onClick={() => run(() => removeAccessCode(c.id, slug))}>Del</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create panel */}
      <div className={`${styles.card} ${styles.cardPad}`}>
        <div className={styles.cardTitle} style={{ marginBottom: 12 }}>Create an access code</div>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 14px" }}>
          Lets someone create/verify their account and get added to this school&apos;s approved list without already being invited. From then on they just sign in normally with a magic link.
        </p>
        <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Show (optional)</label>
        <select className={styles.select} value={newShowId} onChange={(e) => setNewShowId(e.target.value)}>
          <option value="">Whole school</option>
          {shows.map((s) => (
            <option key={s.id} value={s.id}>{s.title}</option>
          ))}
        </select>
        <div style={{ fontSize: 11.5, color: "var(--text-3)", margin: "6px 0 14px" }}>
          If set, using this code takes them straight to that show after signing in.
        </div>
        <button
          className={styles.primaryBtn}
          style={{ width: "100%" }}
          disabled={pending}
          onClick={() => run(() => createAccessCode(schoolId, slug, newShowId || null))}
        >
          {pending ? "Creating…" : "Create code"}
        </button>
        {msg && <div className={`${styles.msg} ${styles.msgErr}`}>{msg}</div>}
      </div>
    </div>
  );
}
