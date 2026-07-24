"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { formatPrice } from "@/lib/format";
import { reorderShow } from "@/app/(admin)/admin/[slug]/shows/actions";

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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
