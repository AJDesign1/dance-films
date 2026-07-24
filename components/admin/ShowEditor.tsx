"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { createShow, updateShow, type ShowForm } from "@/app/(admin)/admin/[slug]/shows/actions";

export type EditableShow = {
  id: string;
  title: string;
  season: string | null;
  show_year: number | null;
  price_pence: number;
  intro_text: string | null;
  artwork_url: string | null;
  status: "draft" | "published";
};

export default function ShowEditor({
  slug,
  schoolId,
  show,
}: {
  slug: string;
  schoolId: string;
  show: EditableShow | null;
}) {
  const [form, setForm] = useState<ShowForm>({
    title: show?.title ?? "",
    season: show?.season ?? "",
    show_year: show?.show_year ? String(show.show_year) : "",
    price: show ? String(show.price_pence / 100) : "",
    intro_text: show?.intro_text ?? "",
    artwork_url: show?.artwork_url ?? "",
    status: show?.status ?? "draft",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (k: keyof ShowForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function save() {
    setError(null);
    startTransition(async () => {
      const res = show ? await updateShow(show.id, slug, form) : await createShow(schoolId, slug, form);
      if (res && "error" in res) setError(res.error); // success redirects server-side
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 22, alignItems: "start", maxWidth: 960 }}>
      <div className={`${styles.card} ${styles.cardPad}`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><label className={styles.fieldLabel} style={{ marginTop: 0 }}>Show title</label><input className={styles.input} value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><label className={styles.fieldLabel} style={{ marginTop: 0 }}>Season / tag</label><input className={styles.input} value={form.season} onChange={(e) => set("season", e.target.value)} placeholder="e.g. Summer Showcase" /></div>
          <div><label className={styles.fieldLabel} style={{ marginTop: 0 }}>Year</label><input className={styles.input} value={form.show_year} onChange={(e) => set("show_year", e.target.value)} placeholder="2025" inputMode="numeric" /></div>
          <div><label className={styles.fieldLabel} style={{ marginTop: 0 }}>Full-show price (£)</label><input className={styles.input} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="24" inputMode="decimal" /></div>
        </div>
        <label className={styles.fieldLabel}>Intro text</label>
        <textarea className={styles.textarea} rows={4} value={form.intro_text} onChange={(e) => set("intro_text", e.target.value)} />
        <label className={styles.fieldLabel}>Cover artwork URL</label>
        <input className={styles.input} value={form.artwork_url} onChange={(e) => set("artwork_url", e.target.value)} placeholder="https://…  (upload support coming later)" style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }} />
        {form.artwork_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.artwork_url} alt="" style={{ marginTop: 12, width: 150, aspectRatio: "3/4", objectFit: "cover", borderRadius: "var(--r-md)", border: "1px solid var(--border)" }} />
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.cardTitle} style={{ marginBottom: 14 }}>Publish</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button onClick={() => set("status", "draft")} className={form.status === "draft" ? styles.primaryBtn : styles.secondaryBtn} style={{ flex: 1 }}>Draft</button>
            <button onClick={() => set("status", "published")} className={form.status === "published" ? styles.primaryBtn : styles.secondaryBtn} style={{ flex: 1 }}>Published</button>
          </div>
          <button className={styles.primaryBtn} style={{ width: "100%" }} disabled={pending} onClick={save}>{pending ? "Saving…" : "Save show"}</button>
          <Link href={`/admin/${slug}/shows`} className={styles.secondaryBtn} style={{ width: "100%", marginTop: 10 }}>Cancel</Link>
          {error && <div className={`${styles.msg} ${styles.msgErr}`}>{error}</div>}
        </div>
        {show && (
          <Link href={`/admin/${slug}/performances?show=${show.id}`} className={`${styles.card} ${styles.cardPad}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
            <span><span style={{ fontWeight: 700, fontSize: 14, display: "block", color: "var(--text)" }}>Performances</span><span style={{ fontSize: 12.5, color: "var(--text-2)" }}>Full-show video &amp; individual dances</span></span>
            <span style={{ color: "var(--text-3)" }}>›</span>
          </Link>
        )}
      </div>
    </div>
  );
}
