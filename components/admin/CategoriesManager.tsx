"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { addCategory, renameCategory, removeCategory, reorderCategory } from "@/app/(admin)/admin/[slug]/categories/actions";

export type CatRow = { id: string; name: string; count: number };
type Kind = "group" | "style";

export default function CategoriesManager({
  slug,
  showId,
  groups,
  styles: styleRows,
}: {
  slug: string;
  showId: string;
  groups: CatRow[];
  styles: CatRow[];
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, alignItems: "start" }}>
      <Section slug={slug} showId={showId} kind="group" title="Class & group tags" hint="Age/class groups — the primary filter row on the show page." rows={groups} placeholder="e.g. Seniors (13+)" />
      <Section slug={slug} showId={showId} kind="style" title="Dance styles" hint="The secondary style filter row (Ballet, Tap, …)." rows={styleRows} placeholder="e.g. Ballet" />
    </div>
  );
}

function Section({ slug, showId, kind, title, hint, rows, placeholder }: { slug: string; showId: string; kind: Kind; title: string; hint: string; rows: CatRow[]; placeholder: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>, after?: () => void) =>
    startTransition(async () => { await fn(); after?.(); router.refresh(); });

  return (
    <div className={`${styles.card} ${styles.cardPad}`}>
      <div className={styles.cardTitle}>{title}</div>
      <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "4px 0 14px" }}>{hint}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input className={styles.input} placeholder={placeholder} value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) run(() => addCategory(showId, slug, name, kind), () => setName("")); }} />
        <button className={styles.primaryBtn} disabled={pending || !name.trim()} onClick={() => run(() => addCategory(showId, slug, name, kind), () => setName(""))}>Add</button>
      </div>
      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        {rows.length === 0 ? (
          <div style={{ padding: "18px 14px", color: "var(--text-3)", fontSize: 13 }}>None yet.</div>
        ) : rows.map((c, i) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <button className={styles.quietBtn} style={{ padding: 2, border: "none" }} disabled={pending || i === 0} onClick={() => run(() => reorderCategory(c.id, slug, -1))}>▲</button>
              <button className={styles.quietBtn} style={{ padding: 2, border: "none" }} disabled={pending || i === rows.length - 1} onClick={() => run(() => reorderCategory(c.id, slug, 1))}>▼</button>
            </div>
            <input defaultValue={c.name} className={styles.input} style={{ flex: 1, padding: "8px 10px", border: "1px solid transparent", background: "transparent" }}
              onBlur={(e) => { if (e.target.value.trim() && e.target.value !== c.name) run(() => renameCategory(c.id, slug, e.target.value)); }} />
            <span style={{ fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>{c.count} used</span>
            <button className={styles.dangerBtn} disabled={pending} onClick={() => run(() => removeCategory(c.id, slug))}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
