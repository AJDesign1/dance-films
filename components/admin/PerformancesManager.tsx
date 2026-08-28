"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { MAX_IMAGE_BYTES, tooLargeMessage, uploadFailedMessage } from "@/lib/uploads";
import {
  setFullShowVideo, addPerformance, updatePerformanceField, setPerformanceCategory,
  removePerformance, reorderPerformance, bulkAddPerformances,
  setPerformanceVideoSource, setPerformanceClip, uploadPerformanceThumbnail,
} from "@/app/(admin)/admin/[slug]/performances/actions";

export type PerfRow = {
  id: string;
  title: string;
  videoSource: "show" | "standalone";
  bunnyVideoId: string;
  clipStart: string; // formatted clock, e.g. "12:45"
  clipEnd: string;
  thumbnailUrl: string;
  duration: string; // formatted
  groupId: string;
  styleId: string;
};
type Cat = { id: string; name: string };

const GRID = "34px 62px minmax(130px,1fr) 124px 124px 118px 186px 70px 52px";

const cell: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid transparent", background: "transparent", fontSize: 13.5, color: "var(--text)", fontFamily: "var(--body)" };
const mono: React.CSSProperties = { ...cell, fontFamily: "ui-monospace, monospace", fontSize: 12.5 };
const timeInput: React.CSSProperties = { ...mono, width: 84, textAlign: "center", padding: "8px 4px" };

export default function PerformancesManager({
  slug, schoolId, showId, fullBunnyVideoId, fullDuration, fullDownload, fullThumbnailUrl, performances, groups, styles: styleCats,
}: {
  slug: string; schoolId: string; showId: string; fullBunnyVideoId: string; fullDuration: string; fullDownload: string; fullThumbnailUrl: string;
  performances: PerfRow[]; groups: Cat[]; styles: Cat[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>, after?: () => void) => startTransition(async () => { await fn(); after?.(); router.refresh(); });

  const hasShowVideo = !!fullBunnyVideoId.trim();
  const chapterCount = performances.filter((p) => p.videoSource === "show").length;

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
        <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 14px", maxWidth: 620 }}>
          The complete recording parents receive with the full-show purchase. Dances set to <strong>Show video</strong> below play a section of
          this same recording, so you only upload once.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Bunny video ID</label>
            <input className={styles.input} style={{ fontFamily: "ui-monospace, monospace" }} defaultValue={fullBunnyVideoId} placeholder="e.g. 3a1f9c2e-…-guid"
              onBlur={(e) => run(() => setFullShowVideo(showId, slug, e.target.value, fullDuration, fullDownload, fullThumbnailUrl))} />
          </div>
          <div style={{ width: 150 }}>
            <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Total length</label>
            <input className={styles.input} style={{ textAlign: "center" }} defaultValue={fullDuration} placeholder="1:12:40"
              onBlur={(e) => run(() => setFullShowVideo(showId, slug, fullBunnyVideoId, e.target.value, fullDownload, fullThumbnailUrl))} />
          </div>
        </div>
        <label className={styles.fieldLabel}>Download URL (full-show file — parents download their purchased show)</label>
        <input className={styles.input} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }} defaultValue={fullDownload}
          placeholder="https://…  (a Bunny Stream direct file URL, or any hosted file)"
          onBlur={(e) => run(() => setFullShowVideo(showId, slug, fullBunnyVideoId, fullDuration, e.target.value, fullThumbnailUrl))} />
        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6 }}>Leave blank to hide the download button. The link is entitlement-gated — only owners can fetch it.</div>
        <label className={styles.fieldLabel}>Thumbnail URL (poster shown before playback)</label>
        <input className={styles.input} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }} defaultValue={fullThumbnailUrl}
          placeholder="https://vz-….b-cdn.net/{video id}/thumbnail_….jpg — copy from Bunny's dashboard for this video"
          onBlur={(e) => run(() => setFullShowVideo(showId, slug, fullBunnyVideoId, fullDuration, fullDownload, e.target.value))} />
        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6 }}>Leave blank to show a plain background instead.</div>
      </div>

      {!hasShowVideo && chapterCount > 0 && (
        <div className={`${styles.msg} ${styles.msgWarn ?? ""}`} style={{ marginBottom: 14, background: "var(--warn-tint, #FFF4E5)", color: "var(--warn, #8A5A00)", padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 13 }}>
          {chapterCount} {chapterCount === 1 ? "dance is" : "dances are"} set to play a section of the show video, but no full-show Bunny video ID is set above — those dances won&apos;t play until it is.
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 11 }}>
        <span className={styles.cardTitle}>Individual performances</span>
        <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Class clips, watched one by one</span>
      </div>

      {bulkOpen && (
        <div className={`${styles.card} ${styles.cardPad}`} style={{ marginBottom: 18, borderColor: "var(--accent)" }}>
          <div className={styles.cardTitle} style={{ marginBottom: 6 }}>Bulk add performances</div>
          <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "0 0 12px" }}>
            One per line: <code style={{ background: "var(--surface-2)", padding: "1px 6px", borderRadius: 4 }}>Title | Group | Bunny video ID | Duration</code>. Group/ID/Duration optional.
            Leave the Bunny ID blank to use the show video — then set each dance&apos;s start and end times below.
          </p>
          <textarea className={styles.textarea} rows={5} style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={bulk} onChange={(e) => setBulk(e.target.value)}
            placeholder={"Twinkle | Minis (3–5) | | \nPlayground | Midis (5–7) | | "} />
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className={styles.primaryBtn} disabled={pending || !bulk.trim()} onClick={() => run(async () => { const r = await bulkAddPerformances(showId, slug, bulk); setMsg("error" in r ? r.error : (r.message ?? "Added.")); }, () => { setBulk(""); setBulkOpen(false); })}>Add all</button>
            <button className={styles.secondaryBtn} onClick={() => setBulkOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
      {msg && <div className={`${styles.msg} ${styles.msgOk}`} style={{ marginBottom: 12 }}>{msg}</div>}

      <div className={styles.card} style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 1080 }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>
            <span></span><span>Image</span><span>Title</span><span>Group</span><span>Style</span><span>Video</span><span>Source detail</span><span>Length</span><span></span>
          </div>
          {performances.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 18, textTransform: "uppercase" }}>No performances yet</div>
              <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Add them one by one, or paste a list to add several.</p>
            </div>
          ) : performances.map((p, i) => (
            <Row
              key={p.id}
              perf={p}
              index={i}
              total={performances.length}
              slug={slug}
              schoolId={schoolId}
              groups={groups}
              styleCats={styleCats}
              pending={pending}
              run={run}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function Row({
  perf: p, index: i, total, slug, schoolId, groups, styleCats, pending, run,
}: {
  perf: PerfRow; index: number; total: number; slug: string; schoolId: string;
  groups: Cat[]; styleCats: Cat[]; pending: boolean;
  run: (fn: () => Promise<unknown>, after?: () => void) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Start and end are saved together (the DB check constraint compares them),
  // so both live here rather than being read off the individual inputs.
  const [start, setStart] = useState(p.clipStart);
  const [end, setEnd] = useState(p.clipEnd);

  const isChapter = p.videoSource === "show";

  const saveClip = (nextStart: string, nextEnd: string) => {
    if (nextStart === p.clipStart && nextEnd === p.clipEnd) return;
    setErr(null);
    run(async () => {
      const r = await setPerformanceClip(p.id, slug, nextStart, nextEnd);
      if ("error" in r) setErr(r.error);
    });
  };

  async function onPickFile(file: File) {
    setErr(null);
    if (file.size > MAX_IMAGE_BYTES) { setErr(tooLargeMessage(MAX_IMAGE_BYTES)); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await uploadPerformanceThumbnail(schoolId, fd);
      if ("error" in r) { setErr(r.error); return; }
      run(() => updatePerformanceField(p.id, slug, "thumbnail_url", r.url));
    } catch {
      // Never leave the control stuck on "…" — see DECISIONS.md on upload
      // handlers that had no catch and hung forever on a thrown action.
      setErr(uploadFailedMessage(MAX_IMAGE_BYTES));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 10, alignItems: "center", padding: "9px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <button className={styles.quietBtn} style={{ padding: 1, border: "none" }} disabled={pending || i === 0} onClick={() => run(() => reorderPerformance(p.id, slug, -1))}>▲</button>
          <button className={styles.quietBtn} style={{ padding: 1, border: "none" }} disabled={pending || i === total - 1} onClick={() => run(() => reorderPerformance(p.id, slug, 1))}>▼</button>
        </div>

        {/* Poster image — uploaded, because a dance playing a slice of the show
            video has no Bunny thumbnail URL to paste. */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickFile(f); }} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || pending}
            title={p.thumbnailUrl ? "Replace image" : "Upload an image"}
            style={{
              width: 56, height: 34, borderRadius: 6, overflow: "hidden", cursor: "pointer", padding: 0,
              border: p.thumbnailUrl ? "1px solid var(--border)" : "1px dashed var(--border)",
              background: p.thumbnailUrl ? `center/cover no-repeat url(${JSON.stringify(p.thumbnailUrl)})` : "var(--surface-2)",
              color: "var(--text-3)", fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
            }}
          >
            {uploading ? "…" : p.thumbnailUrl ? "" : "ADD"}
          </button>
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

        <select
          className={styles.select}
          style={{ padding: "7px 8px", fontSize: 13 }}
          value={p.videoSource}
          onChange={(e) => run(() => setPerformanceVideoSource(p.id, slug, e.target.value as "show" | "standalone"))}
        >
          <option value="show">Show video</option>
          <option value="standalone">Separate video</option>
        </select>

        {/* Either a slice of the show recording, or this dance's own upload. */}
        {isChapter ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              style={timeInput}
              value={start}
              placeholder="Start"
              onChange={(e) => setStart(e.target.value)}
              onBlur={() => saveClip(start, end)}
            />
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>→</span>
            <input
              style={timeInput}
              value={end}
              placeholder="End"
              onChange={(e) => setEnd(e.target.value)}
              onBlur={() => saveClip(start, end)}
            />
          </div>
        ) : (
          <input style={mono} defaultValue={p.bunnyVideoId} placeholder="Bunny video ID"
            onBlur={(e) => { if (e.target.value !== p.bunnyVideoId) run(() => updatePerformanceField(p.id, slug, "bunny_video_id", e.target.value)); }} />
        )}

        {/* Derived for a clip (end − start), typed for a standalone upload. */}
        {isChapter ? (
          <span style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center" }}>{p.duration || "—"}</span>
        ) : (
          <input style={{ ...cell, textAlign: "center" }} defaultValue={p.duration} placeholder="—"
            onBlur={(e) => { if (e.target.value !== p.duration) run(() => updatePerformanceField(p.id, slug, "duration", e.target.value)); }} />
        )}

        <button className={styles.dangerBtn} disabled={pending} onClick={() => run(() => removePerformance(p.id, slug))}>Del</button>
      </div>
      {err && (
        <div style={{ padding: "0 16px 9px 112px", fontSize: 12, color: "var(--danger, #B4232A)" }}>{err}</div>
      )}
    </div>
  );
}
