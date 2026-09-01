"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { formatPrice } from "@/lib/format";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  reorderShow, deleteShow, getShowDeleteImpact, type ShowDeleteImpact,
} from "@/app/(admin)/admin/[slug]/shows/actions";

export type ShowRow = {
  id: string;
  slug: string;
  title: string;
  season: string | null;
  show_year: number | null;
  price_pence: number;
  status: "draft" | "published";
  perfCount: number;
};

export default function ShowsList({ slug, shows }: { slug: string; shows: ShowRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const move = (id: string, dir: -1 | 1) => startTransition(async () => { await reorderShow(id, slug, dir); router.refresh(); });

  // Deleting a show cascades into parents' entitlements, so the dialog loads
  // the real counts first rather than warning in the abstract.
  const [target, setTarget] = useState<{ id: string; impact: ShowDeleteImpact } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function askDelete(id: string) {
    setError(null);
    setBusy(true);
    startTransition(async () => {
      const res = await getShowDeleteImpact(id);
      setBusy(false);
      if ("error" in res) { setError(res.error); return; }
      setTarget({ id, impact: res });
    });
  }

  function confirmDelete() {
    if (!target) return;
    setBusy(true);
    setError(null);
    startTransition(async () => {
      const res = await deleteShow(target.id, slug);
      setBusy(false);
      if ("error" in res) { setError(res.error); return; }
      setTarget(null);
      router.refresh();
    });
  }

  if (shows.length === 0) {
    return (
      <div className={styles.card} style={{ padding: "50px 20px", textAlign: "center" }}>
        <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 22, textTransform: "uppercase" }}>No shows yet</div>
        <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 18px" }}>Create your first show to start adding performances.</p>
        <Link href={`/admin/${slug}/shows/new`} className={styles.primaryBtn}>New show</Link>
      </div>
    );
  }

  return (
    <div className={styles.card} style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 720 }}>
        <div style={{ display: "grid", gridTemplateColumns: "36px minmax(200px,1fr) 90px 84px 104px 170px", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>
          <span></span><span>Show</span><span>Year</span><span>Price</span><span>Status</span><span></span>
        </div>
        {shows.map((s, i) => (
          <div key={s.id} style={{ display: "grid", gridTemplateColumns: "36px minmax(200px,1fr) 90px 84px 104px 170px", gap: 12, alignItems: "center", padding: "13px 20px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <button className={styles.quietBtn} style={{ padding: 2, border: "none" }} disabled={pending || i === 0} onClick={() => move(s.id, -1)}>▲</button>
              <button className={styles.quietBtn} style={{ padding: 2, border: "none" }} disabled={pending || i === shows.length - 1} onClick={() => move(s.id, 1)}>▼</button>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 19, textTransform: "uppercase", letterSpacing: ".01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>{s.perfCount} performances{s.season ? ` · ${s.season}` : ""}</div>
            </div>
            <span style={{ fontSize: 14, color: "var(--text-2)" }}>{s.show_year ?? "—"}</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{formatPrice(s.price_pence)}</span>
            <span className={`${styles.badge} ${s.status === "published" ? styles.badgeOk : styles.badgeWarn}`}>{s.status === "published" ? "Published" : "Draft"}</span>
            <div style={{ display: "flex", gap: 7, justifyContent: "flex-end" }}>
              <Link href={`/admin/${slug}/performances?show=${s.id}`} className={styles.quietBtn}>Performances</Link>
              <Link href={`/admin/${slug}/shows/${s.id}`} className={styles.quietBtn}>Edit</Link>
              <button className={styles.dangerBtn} disabled={pending} onClick={() => askDelete(s.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {error && !target && (
        <div style={{ padding: "12px 20px", fontSize: 13, color: "var(--danger, #B4232A)" }}>{error}</div>
      )}

      <ConfirmDialog
        open={!!target}
        title="Delete this show?"
        body={
          target
            ? `"${target.impact.title}" and everything inside it will be permanently removed. This can't be undone.`
            : ""
        }
        consequences={
          target
            ? [
                `${target.impact.performances} performance${target.impact.performances === 1 ? "" : "s"}, plus its categories and video settings`,
                target.impact.entitlements > 0
                  ? `${target.impact.entitlements} parent${target.impact.entitlements === 1 ? "" : "s"} will lose access to this show`
                  : "No parents currently have access to this show",
                target.impact.orders > 0
                  ? `${target.impact.orders} order${target.impact.orders === 1 ? "" : "s"} exist — the delete will be refused, set the show to Draft instead`
                  : "No orders are attached to this show",
              ]
            : []
        }
        confirmPhrase={target?.impact.title}
        confirmLabel="Delete show"
        busy={busy}
        error={error}
        onConfirm={confirmDelete}
        onCancel={() => { setTarget(null); setError(null); }}
      />
    </div>
  );
}
