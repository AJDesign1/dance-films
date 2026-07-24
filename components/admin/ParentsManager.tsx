"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { addParent, removeParent, bulkAddParents } from "@/app/(admin)/admin/[slug]/parents/actions";

export type ParentRow = { id: string; email: string; name: string | null; registered: boolean };

export default function ParentsManager({
  schoolId,
  slug,
  parents,
}: {
  schoolId: string;
  slug: string;
  parents: ParentRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok?: boolean; error?: string; message?: string }>, onOk?: () => void) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) {
        setMsg({ ok: false, text: res.error });
      } else {
        if (onOk) onOk();
        if ("message" in res && res.message) setMsg({ ok: true, text: res.message });
        router.refresh();
      }
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
      {/* List */}
      <div className={styles.card} style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          <span>Email</span><span>Status</span><span></span>
        </div>
        {parents.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>No parents invited</div>
            <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Add emails on the right to open access.</p>
          </div>
        ) : (
          parents.map((p) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px", gap: 12, alignItems: "center", padding: "13px 20px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.email}</div>
                {p.name && <div style={{ fontSize: 12, color: "var(--text-3)" }}>{p.name}</div>}
              </div>
              <span className={`${styles.badge} ${p.registered ? styles.badgeOk : styles.badgeMuted}`}>
                {p.registered ? "Signed up" : "Invited"}
              </span>
              <button className={styles.quietBtn} disabled={pending} onClick={() => run(() => removeParent(p.id, slug))}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.cardTitle} style={{ marginBottom: 12 }}>Add a parent</div>
          <input className={styles.input} type="email" placeholder="parent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={styles.input} style={{ marginTop: 8 }} placeholder="Name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className={styles.primaryBtn}
            style={{ marginTop: 10, width: "100%" }}
            disabled={pending}
            onClick={() => run(() => addParent(schoolId, slug, email, name), () => { setEmail(""); setName(""); })}
          >
            {pending ? "Working…" : "Add parent"}
          </button>
          {msg && <div className={`${styles.msg} ${msg.ok ? styles.msgOk : styles.msgErr}`}>{msg.text}</div>}
        </div>

        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.cardTitle} style={{ marginBottom: 6 }}>Bulk / CSV import</div>
          <p style={{ fontSize: 12, color: "var(--text-2)", margin: "0 0 10px" }}>
            Paste emails (one per line or comma-separated), or a CSV — we&apos;ll take the email column.
          </p>
          <textarea className={styles.textarea} rows={4} style={{ fontSize: 13 }} placeholder={"alex@example.com\njamie@example.com, sam@example.com"} value={bulk} onChange={(e) => setBulk(e.target.value)} />
          <button className={styles.secondaryBtn} style={{ marginTop: 10, width: "100%" }} disabled={pending} onClick={() => run(() => bulkAddParents(schoolId, slug, bulk), () => setBulk(""))}>
            Import emails
          </button>
        </div>
      </div>
    </div>
  );
}
