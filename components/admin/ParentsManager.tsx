"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { initials } from "@/lib/format";
import { addParent, removeParent, bulkAddParents } from "@/app/(admin)/admin/[slug]/parents/actions";
import { grantEntitlement, revokeEntitlement } from "@/app/(admin)/admin/[slug]/users/actions";

export type ParentShow = { showId: string; title: string; source: "purchase" | "granted" | null };
export type ParentRow = {
  id: string;
  email: string;
  name: string | null;
  registered: boolean;
  userId: string | null;
  shows: ParentShow[];
};

export default function ParentsManager({
  schoolId,
  slug,
  parents,
  hasShows,
}: {
  schoolId: string;
  slug: string;
  parents: ParentRow[];
  hasShows: boolean;
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

  function toggleAccess(userId: string, showId: string, owned: boolean) {
    startTransition(async () => {
      const res = owned
        ? await revokeEntitlement(userId, showId, slug)
        : await grantEntitlement(userId, showId, slug);
      if (!("error" in res)) router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 22, alignItems: "start" }}>
      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {parents.length === 0 ? (
          <div className={styles.card} style={{ padding: "50px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>No parents invited</div>
            <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Add emails on the right to open access.</p>
          </div>
        ) : (
          parents.map((p) => {
            const paidCount = p.shows.filter((s) => s.source !== null).length;
            return (
              <div key={p.id} className={`${styles.card} ${styles.cardPad}`}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "0 0 auto", width: 38, height: 38, borderRadius: "var(--r-pill)", background: "var(--surface-2)", color: "var(--text-2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                    {initials(p.name ?? p.email)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name ?? p.email}</div>
                    {p.name && <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{p.email}</div>}
                  </div>
                  <span className={`${styles.badge} ${p.registered ? styles.badgeOk : styles.badgeMuted}`}>
                    {p.registered ? "Signed up" : "Invited"}
                  </span>
                  {hasShows && <span style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>{paidCount}/{p.shows.length} shows</span>}
                  <button className={styles.quietBtn} disabled={pending} onClick={() => run(() => removeParent(p.id, slug))}>
                    Remove
                  </button>
                </div>

                {/* Access & payments */}
                {hasShows && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    {!p.registered || !p.userId ? (
                      <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-3)" }}>
                        Access can be given once this parent signs in for the first time.
                      </p>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {p.shows.map((s) => {
                          const paid = s.source === "purchase";
                          const cash = s.source === "granted";
                          const owned = paid || cash;
                          return (
                            <div
                              key={s.showId}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                padding: paid ? "6px 12px" : "6px 8px 6px 12px",
                                borderRadius: "var(--r-pill)",
                                border: `1px solid ${paid ? "var(--success)" : cash ? "var(--warn)" : "var(--border)"}`,
                                background: paid ? "var(--success-tint)" : cash ? "var(--warn-tint)" : "var(--surface-2)",
                              }}
                            >
                              <span style={{ fontSize: 12.5, fontWeight: 600, color: paid ? "var(--success)" : cash ? "var(--warn)" : "var(--text-2)" }}>
                                {s.title}
                              </span>
                              {paid && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--success)" }}>Paid</span>}
                              {cash && (
                                <>
                                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--warn)" }}>Cash</span>
                                  <button
                                    disabled={pending}
                                    onClick={() => toggleAccess(p.userId!, s.showId, true)}
                                    style={{ padding: "4px 10px", borderRadius: "var(--r-pill)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "var(--body)", background: "var(--danger-tint)", color: "var(--danger)" }}
                                  >
                                    Remove
                                  </button>
                                </>
                              )}
                              {!owned && (
                                <button
                                  disabled={pending}
                                  onClick={() => toggleAccess(p.userId!, s.showId, false)}
                                  style={{ padding: "4px 10px", borderRadius: "var(--r-pill)", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "var(--body)", background: "var(--accent)", color: "#fff" }}
                                >
                                  Give access
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
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

        {hasShows && (
          <div className={`${styles.card} ${styles.cardPad}`}>
            <div className={styles.cardTitle} style={{ marginBottom: 8 }}>Access &amp; payments</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: "var(--text-2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: "0 0 auto", width: 12, height: 12, borderRadius: 3, background: "var(--success-tint)", border: "1px solid var(--success)" }} />
                <span><strong style={{ color: "var(--success)" }}>Paid</strong> — bought online by card</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: "0 0 auto", width: 12, height: 12, borderRadius: 3, background: "var(--warn-tint)", border: "1px solid var(--warn)" }} />
                <span><strong style={{ color: "var(--warn)" }}>Cash</strong> — access you gave manually</span>
              </div>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--text-3)", margin: "12px 0 0", lineHeight: 1.5 }}>
              Use <strong>Give access</strong> when a parent has paid you in cash. Card payments (Paid) are managed through Stripe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
