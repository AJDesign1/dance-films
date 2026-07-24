"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import {
  setFullShowVideo, addPerformance, updatePerformanceField, setPerformanceCategory,
  removePerformance, reorderPerformance, bulkAddPerformances,
} from "@/app/(admin)/admin/[slug]/performances/actions";

export type PerfRow = {
  id: string;
  title: string;
  vimeoId: string;
  duration: string; // formatted
  groupId: string;
  styleId: string;
};
type Cat = { id: string; name: string };

export default function PerformancesManager({
  slug, showId, fullVimeo, fullDuration, performances, groups, styles: styleCats,
}: {
  slug: string; showId: string; fullVimeo: string; fullDuration: string;
  performances: PerfRow[]; groups: Cat[]; styles: Cat[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>, after?: () => void) => startTransition(async () => { await fn(); after?.(); router.refresh(); });

  const cell: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid transparent", background: "transparent", fontSize: 13.5, color: "var(--text)", fontFamily: "var(--body)" };
  const mono: React.CSSProperties = { ...cell, fontFamily: "ui-monospace, monospace", fontSize: 12.5 };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--text-3)" }}>{performances.length} performances</span>
        <div style={{ flex: 1 }} />
        <button className={styles.secondaryBtn} onClick={() => setBulkOpen((o) => !o)}>Bulk add</button>
        <button className={styles.primaryBtn} disabled={pending} onClick={() => run(() => addPerformance(showId, slug))}>Add performance</button>
      </div>

      {/* Full-show video */}
      <div className={`${styles.card} ${styles.cardPad}`} style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <span className={styles.cardTitle}>Full-show video</span>
          <span className={`${styles.badge} ${styles.badgeOk}`}>Whole show</span>
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 14px", maxWidth: 560 }}>
          The complete recording parents receive with the full-show purchase. Individual class clips are listed below.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Vimeo ID or URL</label>
            <input className={styles.input} style={{ fontFamily: "ui-monospace, monospace" }} defaultValue={fullVimeo} placeholder="e.g. 903371840"
              onBlur={(e) => run(() => setFullShowVideo(showId, slug, e.target.value, fullDuration))} />
          </div>
          <div style={{ width: 150 }}>
            <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Total length</label>
            <input className={styles.input} style={{ textAlign: "center" }} defaultValue={fullDuration} placeholder="1:12:40"
              onBlur={(e) => run(() => setFullShowVideo(showId, slug, fullVimeo, e.target.value))} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 11 }}>
        <span className={styles.cardTitle}>Individual performances</span>
        <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Class clips, watched one by one</span>
      </div>

      {bulkOpen && (
        <div className={`${styles.card} ${styles.cardPad}`} style={{ marginBottom: 18, borderColor: "var(--accent)" }}>
          <div className={styles.cardTitle} style={{ marginBottom: 6 }}>Bulk add performances</div>
          <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 12px" }}>
            One per line: <code style={{ background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4 }}>Title | Group | Vimeo ID | Duration</code>. Group/Vimeo/Duration optional.
          </p>
          <textarea className={styles.textarea} rows={5} style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={bulk} onChange={(e) => setBulk(e.target.value)}
            placeholder={"Twinkle | Minis (3–5) | 903371840 | 2:05\nPlayground | Midis (5–7) | | 2:48"} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className={styles.primaryBtn} disabled={pending || !bulk.trim()} onClick={() => run(async () => { const r = await bulkAddPerformances(showId, slug, bulk); setMsg("error" in r ? r.error : (r.message ?? "Added.")); }, () => { setBulk(""); setBulkOpen(false); })}>Add all</button>
            <button className={styles.secondaryBtn} onClick={() => setBulkOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <div className={`${styles.msg} ${styles.msgOk}`} style={{ marginBottom: 12 }}>{msg}</div>}

      <div className={styles.card} style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 900 }}>
          <div style={{ display: "grid", gridTemplateColumns: "34px minmax(150px,1fr) 150px 150px 130px 84px 60px", gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>
            <span></span><span>Title</span><span>Group</span><span>Style</span><span>Vimeo</span><span>Length</span><span></span>
          </div>
          {performances.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 18, textTransform: "uppercase" }}>No performances yet</div>
              <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Add them one by one, or paste a list to add several.</p>
            </div>
          ) : performances.map((p, i) => (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "34px minmax(150px,1fr) 150px 150px 130px 84px 60px", gap: 10, alignItems: "center", padding: "9px 16px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <button className={styles.quietBtn} style={{ padding: 1, border: "none" }} disabled={pending || i === 0} onClick={() => run(() => reorderPerformance(p.id, slug, -1))}>▲</button>
                <button className={styles.quietBtn} style={{ padding: 1, border: "none" }} disabled={pending || i === performances.length - 1} onClick={() => run(() => reorderPerformance(p.id, slug, 1))}>▼</button>
              </div>
              <input style={cell} defaultValue={p.title} onBlur={(e) => { if (e.target.value !== p.title) run(() => updatePerformanceField(p.id, slug, "title", e.target.value)); }} />
              <select className={styles.select} style={{ padding: "7px 8px", fontSize: 13 }} defaultValue={p.groupId} onChange={(e) => run(() => setPerformanceCategory(p.id, slug, "group", e.target.value))}>
                <option value="">—</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select className={styles.select} style={{ padding: "7px 8px", fontSize: 13 }} defaultValue={p.styleId} onChange={(e) => run(() => setPerformanceCategory(p.id, slug, "style", e.target.value))}>
                <option value="">—</option>
                {styleCats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input style={mono} defaultValue={p.vimeoId} placeholder="ID or URL" onBlur={(e) => { if (e.target.value !== p.vimeoId) run(() => updatePerformanceField(p.id, slug, "vimeo_id", e.target.value)); }} />
              <input style={{ ...cell, textAlign: "center" }} defaultValue={p.duration} placeholder="—" onBlur={(e) => { if (e.target.value !== p.duration) run(() => updatePerformanceField(p.id, slug, "duration", e.target.value)); }} />
              <button className={styles.dangerBtn} disabled={pending} onClick={() => run(() => removePerformance(p.id, slug))}>Del</button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
