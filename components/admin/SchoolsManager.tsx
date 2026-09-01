"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { createSchool, toggleSchoolStatus, deleteSchool } from "@/app/(admin)/admin/actions";

export type SchoolRow = {
  id: string;
  name: string;
  slug: string;
  platformName: string | null;
  primary: string;
  status: "active" | "disabled";
};

export default function SchoolsManager({ schools }: { schools: SchoolRow[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [sub, setSub] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitNew() {
    setError(null);
    startTransition(async () => {
      const res = await createSchool(name, sub); // success redirects server-side
      if (res && "error" in res) setError(res.error);
    });
  }

  function toggle(id: string, status: "active" | "disabled") {
    startTransition(async () => {
      await toggleSchoolStatus(id, status === "active" ? "disabled" : "active");
      router.refresh();
    });
  }

  // Was a window.confirm — too easy to dismiss on reflex for something this
  // destructive, and it can't show what's about to go. Now the same typed
  // confirmation the show delete uses.
  const [target, setTarget] = useState<{ id: string; name: string } | null>(null);

  function confirmRemove() {
    if (!target) return;
    setDeleteError(null);
    startTransition(async () => {
      const res = await deleteSchool(target.id);
      if (res && "error" in res) {
        setDeleteError(res.error);
        return;
      }
      setTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button className={styles.primaryBtn} onClick={() => setAdding((a) => !a)}>{adding ? "Cancel" : "Add school"}</button>
      </div>

      {adding && (
        <div className={`${styles.card} ${styles.cardPad}`} style={{ marginBottom: 18, borderColor: "var(--accent)", maxWidth: 620 }}>
          <div className={styles.cardTitle} style={{ marginBottom: 12 }}>Add a school</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className={styles.fieldLabel} style={{ marginTop: 0 }}>School name</label>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stardust Academy of Dance" />
            </div>
            <div>
              <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Subdomain</label>
              <div style={{ display: "flex", alignItems: "center", border: "1.5px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden", background: "var(--surface-2)" }}>
                <input value={sub} onChange={(e) => setSub(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="stardust" style={{ flex: 1, padding: "11px 4px 11px 12px", border: "none", background: "transparent", fontSize: 14, color: "var(--text)", outline: "none", textAlign: "right", fontFamily: "var(--body)" }} />
                <span style={{ padding: "0 12px 0 2px", fontSize: 13, color: "var(--text-3)", whiteSpace: "nowrap" }}>.dancefilms.co.uk</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
            <button className={styles.primaryBtn} disabled={pending} onClick={submitNew}>{pending ? "Creating…" : "Create & configure"}</button>
            {error && <span className={`${styles.msg} ${styles.msgErr}`} style={{ margin: 0 }}>{error}</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-3)", margin: "10px 0 0" }}>You&apos;ll land on the new school&apos;s Branding page to set colours, logo and shows.</p>
        </div>
      )}

      <div className={styles.card} style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 360px", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          <span>School</span><span>Subdomain</span><span>Status</span><span></span>
        </div>
        {deleteError && (
          <div className={`${styles.msg} ${styles.msgErr}`} style={{ padding: "12px 20px", margin: 0, borderBottom: "1px solid var(--border)" }}>{deleteError}</div>
        )}
        {schools.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 22, textTransform: "uppercase", color: "var(--text)" }}>No schools yet</div>
            <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Add your first school and give it a subdomain to get started.</p>
          </div>
        ) : schools.map((s) => (
          <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 110px 360px", gap: 12, alignItems: "center", padding: "15px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ flex: "0 0 auto", width: 34, height: 34, borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--disp)", fontWeight: 800, fontSize: 15, color: "#fff", background: s.primary }}>{s.name.charAt(0)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>{s.platformName ?? "—"}</div>
              </div>
            </div>
            <a href={`/?school=${s.slug}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.slug}.dancefilms.co.uk</a>
            <span className={`${styles.badge} ${s.status === "active" ? styles.badgeOk : styles.badgeMuted}`}>{s.status === "active" ? "Active" : "Disabled"}</span>
            <div style={{ display: "flex", gap: 7, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <a href={`https://${s.slug}.dancefilms.co.uk`} target="_blank" rel="noreferrer" className={styles.quietBtn}>View site</a>
              <button className={styles.quietBtn} disabled={pending} onClick={() => toggle(s.id, s.status)}>{s.status === "active" ? "Disable" : "Enable"}</button>
              <Link href={`/admin/${s.slug}`} className={styles.primaryBtn} style={{ padding: "7px 14px", fontSize: 12.5 }}>Configure</Link>
              <button className={styles.dangerBtn} disabled={pending} onClick={() => setTarget({ id: s.id, name: s.name })}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!target}
        title="Delete this school?"
        body={
          target
            ? `"${target.name}" will be permanently removed, along with everything belonging to it. This can't be undone.`
            : ""
        }
        consequences={[
          "Every show, performance, category and video setting",
          "All branding, logos and page content",
          "The parent invite list, access codes and their access to any show",
        ]}
        confirmPhrase={target?.name}
        confirmLabel="Delete school"
        busy={pending}
        error={deleteError}
        onConfirm={confirmRemove}
        onCancel={() => { setTarget(null); setDeleteError(null); }}
      />
    </>
  );
}
