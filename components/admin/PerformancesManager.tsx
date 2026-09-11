"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";
import { MAX_IMAGE_BYTES, tooLargeMessage, uploadFailedMessage } from "@/lib/uploads";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { formatClock } from "@/lib/format";
import { compressImage } from "@/lib/imageCompress";
import {
  addPerformance, removePerformance, reorderPerformance,
  bulkAddPerformances, uploadThumbnailImage, savePerformancesPage,
  previewBunnyChapters, importBunnyChapters,
  getAutoThumbnailSources, uploadPerformanceThumbnail,
  type PerformanceDraft, type FullShowDraft, type ChapterPreview, type AutoThumbnailSource,
} from "@/app/(admin)/admin/[slug]/performances/actions";

export type PerfRow = {
  id: string;
  title: string;
  videoSource: "show" | "standalone";
  bunnyVideoId: string;
  clipStart: string;
  clipEnd: string;
  thumbnailUrl: string;
  duration: string;
  groupId: string;
  styleId: string;
};
type Cat = { id: string; name: string };

const GRID = "34px 62px minmax(130px,1fr) 124px 124px 118px 186px 70px 52px";

const cell: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)", border: "1px solid transparent", background: "transparent", fontSize: 13.5, color: "var(--text)", fontFamily: "var(--body)" };
const mono: React.CSSProperties = { ...cell, fontFamily: "ui-monospace, monospace", fontSize: 12.5 };
const timeInput: React.CSSProperties = { ...mono, width: 84, textAlign: "center", padding: "8px 4px" };

function waitForVideoEvent(video: HTMLVideoElement, event: "loadedmetadata" | "seeked", timeoutMs = 45000): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener(event, onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new Error("The video couldn't be loaded.")); };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(event === "seeked" ? "The video took too long to seek." : "The video took too long to load."));
    }, timeoutMs);
    video.addEventListener(event, onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

async function loadCaptureVideo(video: HTMLVideoElement, sourceUrl: string): Promise<void> {
  video.crossOrigin = "anonymous";
  video.preload = "metadata";
  video.muted = true;
  video.playsInline = true;
  video.src = sourceUrl;
  video.load();
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    await waitForVideoEvent(video, "loadedmetadata");
  }
}

async function captureFrame(video: HTMLVideoElement, requestedSeconds: number): Promise<Blob> {
  const latest = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.1) : requestedSeconds;
  const target = Math.min(Math.max(0, requestedSeconds), latest);
  if (Math.abs(video.currentTime - target) > 0.05 || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    video.currentTime = target;
    await waitForVideoEvent(video, "seeked");
  }

  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) throw new Error("The video frame isn't ready yet.");
  const width = Math.min(800, sourceWidth);
  const height = Math.max(1, Math.round(sourceHeight * (width / sourceWidth)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser can't create the thumbnail image.");
  context.drawImage(video, 0, 0, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("This browser couldn't encode the thumbnail image.")),
      "image/webp",
      0.8,
    );
  });
}

/** Edits live here until Save; `thumbnailUrl` is excluded because uploads save immediately. */
type Draft = { full: FullShowDraft; rows: PerfRow[] };

function buildDraft(
  fullBunnyVideoId: string, fullDuration: string, fullDownload: string, fullThumbnailUrl: string,
  performances: PerfRow[],
): Draft {
  return {
    full: { bunnyVideoId: fullBunnyVideoId, duration: fullDuration, downloadUrl: fullDownload, thumbnailUrl: fullThumbnailUrl },
    rows: performances.map((p) => ({ ...p })),
  };
}

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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState<{ done: number; total: number } | null>(null);

  const serverState = useMemo(
    () => buildDraft(fullBunnyVideoId, fullDuration, fullDownload, fullThumbnailUrl, performances),
    [fullBunnyVideoId, fullDuration, fullDownload, fullThumbnailUrl, performances],
  );
  const [draft, setDraft] = useState<Draft>(serverState);

  // Structural actions (add/delete/reorder) refresh from the server, so adopt
  // the new server state as the baseline when it changes.
  useEffect(() => { setDraft(serverState); }, [serverState]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(serverState),
    [draft, serverState],
  );

  // A page reload or a click on another admin link would silently discard
  // buffered edits, which is exactly the failure the Save button exists to
  // prevent — so warn on the way out.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setFull = (patch: Partial<FullShowDraft>) =>
    setDraft((d) => ({ ...d, full: { ...d.full, ...patch } }));
  const setRow = (id: string, patch: Partial<PerfRow>) =>
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));

  const save = useCallback(async (): Promise<boolean> => {
    setError(null);
    setMsg(null);
    setSaving(true);
    try {
      const rows: PerformanceDraft[] = draft.rows.map((r) => ({
        id: r.id, title: r.title, videoSource: r.videoSource, bunnyVideoId: r.bunnyVideoId,
        clipStart: r.clipStart, clipEnd: r.clipEnd, duration: r.duration,
        groupId: r.groupId, styleId: r.styleId,
      }));
      const res = await savePerformancesPage(showId, slug, draft.full, rows);
      if ("error" in res) { setError(res.error); return false; }
      setMsg(res.message ?? "Saved.");
      router.refresh();
      return true;
    } catch {
      setError("Couldn't save. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, showId, slug, router]);

  /**
   * Add / delete / reorder all re-read from the server, which would throw away
   * anything buffered — so flush first rather than blocking the button or
   * losing the edits.
   */
  const structural = (fn: () => Promise<unknown>) => {
    startTransition(async () => {
      if (dirty && !(await save())) return;
      await fn();
      router.refresh();
    });
  };

  const hasShowVideo = !!draft.full.bunnyVideoId.trim();
  const chapterCount = draft.rows.filter((r) => r.videoSource === "show").length;
  const busy = pending || saving || generating;

  // ---- Automatic performance thumbnails --------------------------------
  // Bunny has no per-timestamp poster endpoint. Seeking the direct MP4 here
  // lets the browser fetch only the byte ranges around each chapter mark; the
  // full recording is not downloaded. The resulting small WebPs then follow
  // the same storage/proxy path as manually uploaded posters.
  const generateMissingThumbnails = useCallback(async (saveFirst = true): Promise<void> => {
    setError(null);
    setMsg(null);
    setGenerating(true);
    setGenerateProgress(null);

    try {
      if (saveFirst && dirty && !(await save())) return;
      const result = await getAutoThumbnailSources(showId);
      if ("error" in result) { setError(result.error); return; }
      if (result.length === 0) {
        setMsg("Every performance already has a thumbnail, or has no usable video yet.");
        return;
      }

      const grouped = new Map<string, AutoThumbnailSource[]>();
      for (const row of result) {
        const group = grouped.get(row.sourceUrl) ?? [];
        group.push(row);
        grouped.set(row.sourceUrl, group);
      }

      let done = 0;
      let failed = 0;
      setGenerateProgress({ done, total: result.length });

      for (const [sourceUrl, rows] of grouped) {
        const video = document.createElement("video");
        video.style.position = "fixed";
        video.style.width = "1px";
        video.style.height = "1px";
        video.style.opacity = "0";
        video.style.pointerEvents = "none";
        document.body.appendChild(video);

        try {
          await loadCaptureVideo(video, sourceUrl);
          for (const row of rows) {
            try {
              const blob = await captureFrame(video, row.atSeconds);
              const formData = new FormData();
              formData.append("file", new File([blob], `${row.performanceId}.webp`, { type: "image/webp" }));
              const upload = await uploadPerformanceThumbnail(row.performanceId, showId, slug, formData, true);
              if ("error" in upload) failed++;
            } catch {
              failed++;
            } finally {
              done++;
              setGenerateProgress({ done, total: result.length });
            }
          }
        } catch {
          failed += rows.length;
          done += rows.length;
          setGenerateProgress({ done, total: result.length });
        } finally {
          video.removeAttribute("src");
          video.load();
          video.remove();
        }
      }

      router.refresh();
      const made = result.length - failed;
      if (failed > 0) {
        setError(`Generated ${made} thumbnail${made === 1 ? "" : "s"}; ${failed} couldn't be created. You can retry or upload those images manually.`);
      } else {
        setMsg(`Generated ${made} thumbnail${made === 1 ? "" : "s"} from the performance start times.`);
      }
    } catch {
      setError("Couldn't generate the thumbnails. Check the video is available and try again.");
    } finally {
      setGenerating(false);
      setGenerateProgress(null);
    }
  }, [dirty, save, showId, slug, router]);

  // ---- Import from Bunny -------------------------------------------------
  // Chaptering the show once in Bunny and pulling the marks across beats
  // typing every start and end by hand. Previewed before anything is written.
  const [importPreview, setImportPreview] = useState<ChapterPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const importRows = importPreview?.rows ?? null;

  function openImport() {
    setError(null);
    setMsg(null);
    setImporting(true);
    startTransition(async () => {
      const res = await previewBunnyChapters(showId);
      setImporting(false);
      if ("error" in res) { setError(res.error); return; }
      setImportPreview(res);
    });
  }

  function confirmImport() {
    setImporting(true);
    startTransition(async () => {
      const res = await importBunnyChapters(showId, slug);
      setImporting(false);
      setImportPreview(null);
      if ("error" in res) { setError(res.error); return; }
      setMsg(res.message ?? "Imported.");
      router.refresh();
      // New chapter rows have no custom artwork, so make their default poster
      // frames immediately. Existing/manual thumbnails are skipped server-side.
      await generateMissingThumbnails(false);
    });
  }

  const newChapterCount = (importRows ?? []).filter((r) => !r.alreadyImported).length;

  // ---- Full-show poster image -------------------------------------------
  // Was a pasted Bunny URL. Bunny renames the file when a custom thumbnail is
  // set, so the pasted one silently kept serving the old auto-generated frame.
  const fullThumbRef = useRef<HTMLInputElement>(null);
  const [fullThumbBusy, setFullThumbBusy] = useState(false);
  const [fullThumbError, setFullThumbError] = useState<string | null>(null);

  async function onPickFullThumb(file: File) {
    setFullThumbError(null);
    setFullThumbBusy(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > MAX_IMAGE_BYTES) { setFullThumbError(tooLargeMessage(MAX_IMAGE_BYTES)); return; }
      const fd = new FormData();
      fd.append("file", compressed);
      const r = await uploadThumbnailImage(schoolId, fd);
      if ("error" in r) { setFullThumbError(r.error); return; }
      // Into the draft, not straight to the database — it saves with the rest
      // of the screen, so this can be undone with Remove before committing.
      setFull({ thumbnailUrl: r.url });
    } catch {
      setFullThumbError(uploadFailedMessage(MAX_IMAGE_BYTES));
    } finally {
      setFullThumbBusy(false);
    }
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "var(--text-3)" }}>{draft.rows.length} performances</span>
        {dirty && (
          <span className={`${styles.badge} ${styles.badgeWarn}`}>Unsaved changes</span>
        )}
        <div style={{ flex: 1 }} />
        <button
          className={styles.secondaryBtn}
          disabled={busy || draft.rows.length === 0}
          title="Create images for performances that do not already have one, using their video start times"
          onClick={() => void generateMissingThumbnails()}
        >
          {generating && generateProgress
            ? `Generating ${generateProgress.done}/${generateProgress.total}…`
            : generating
              ? "Preparing thumbnails…"
              : "Generate missing thumbnails"}
        </button>
        <button
          className={styles.secondaryBtn}
          disabled={busy || importing || !hasShowVideo}
          title={hasShowVideo ? "Create a performance from each chapter marked on the show video in Bunny" : "Set the full-show Bunny video ID first"}
          onClick={openImport}
        >
          {importing && !importRows ? "Checking…" : "Import from Bunny"}
        </button>
        <button className={styles.secondaryBtn} onClick={() => setBulkOpen((o) => !o)}>Bulk add</button>
        <button className={styles.secondaryBtn} disabled={busy} onClick={() => structural(() => addPerformance(showId, slug))}>Add performance</button>
        <button
          className={styles.primaryBtn}
          disabled={busy || !dirty}
          style={!dirty && !busy ? { opacity: 0.55 } : undefined}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
        </button>
      </div>

      {error && <div className={`${styles.msg} ${styles.msgErr}`} style={{ marginBottom: 12 }}>{error}</div>}
      {msg && !dirty && <div className={`${styles.msg} ${styles.msgOk}`} style={{ marginBottom: 12 }}>{msg}</div>}

      {importRows && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Import chapters from Bunny"
          onClick={() => !importing && setImportPreview(null)}
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(12,20,26,.62)", backdropFilter: "blur(3px)" }}
        >
          <div onClick={(e) => e.stopPropagation()} className={styles.card} style={{ width: "100%", maxWidth: 560, padding: 24, maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: "var(--text)" }}>
              Import chapters from Bunny
            </div>
            <p style={{ margin: "10px 0 14px", fontSize: 14, lineHeight: 1.55, color: "var(--text-2)" }}>
              {newChapterCount > 0
                ? `${newChapterCount} new ${newChapterCount === 1 ? "chapter" : "chapters"} will be added as performances, set to play a section of the show video. Nothing already in the list is changed.`
                : "Every chapter on this video is already in the list."}
            </p>

            <div style={{ overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--r-sm)" }}>
              {importRows.map((c) => (
                <div key={`${c.start}-${c.title}`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: "1px solid var(--border)", opacity: c.alreadyImported ? 0.5 : 1 }}>
                  <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--text-3)", whiteSpace: "nowrap" }}>
                    {formatClock(c.start)} → {formatClock(c.end)}
                  </span>
                  <span style={{ fontSize: 13.5, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                  {c.alreadyImported && <span className={`${styles.badge} ${styles.badgeMuted}`}>Already added</span>}
                </div>
              ))}
            </div>

            {(importPreview?.willSetDownloadUrl || importPreview?.willSetDuration) && (
              <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--surface-2)", borderRadius: "var(--r-sm)", fontSize: 12.5, color: "var(--text-2)" }}>
                Also taken from Bunny:
                {importPreview.willSetDownloadUrl && <> the <strong>download link</strong></>}
                {importPreview.willSetDownloadUrl && importPreview.willSetDuration && " and"}
                {importPreview.willSetDuration && <> the <strong>total length</strong> ({importPreview.willSetDuration})</>}.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
              <button className={styles.secondaryBtn} disabled={importing} onClick={() => setImportPreview(null)}>Cancel</button>
              <button
                className={styles.primaryBtn}
                disabled={importing || (newChapterCount === 0 && !importPreview?.willSetDownloadUrl && !importPreview?.willSetDuration)}
                onClick={confirmImport}
              >
                {importing
                  ? "Adding…"
                  : newChapterCount > 0
                    ? `Add ${newChapterCount} performance${newChapterCount === 1 ? "" : "s"}`
                    : "Update from Bunny"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <input className={styles.input} style={{ fontFamily: "ui-monospace, monospace" }} value={draft.full.bunnyVideoId} placeholder="e.g. 3a1f9c2e-…-guid"
              onChange={(e) => setFull({ bunnyVideoId: e.target.value })} />
          </div>
          <div style={{ width: 150 }}>
            <label className={styles.fieldLabel} style={{ marginTop: 0 }}>Total length</label>
            <input className={styles.input} style={{ textAlign: "center" }} value={draft.full.duration} placeholder="01:12:40"
              onChange={(e) => setFull({ duration: e.target.value })} />
          </div>
        </div>
        <label className={styles.fieldLabel}>Download URL (full-show file — parents download their purchased show)</label>
        <input className={styles.input} style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }} value={draft.full.downloadUrl}
          placeholder="https://…  (a Bunny Stream direct file URL, or any hosted file)"
          onChange={(e) => setFull({ downloadUrl: e.target.value })} />
        <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 6 }}>Leave blank to hide the download button. The link is entitlement-gated — only owners can fetch it.</div>
        <label className={styles.fieldLabel}>Poster image (shown before playback)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div
            style={{
              width: 176, height: 99, borderRadius: 8, overflow: "hidden", flex: "0 0 auto",
              border: draft.full.thumbnailUrl ? "1px solid var(--border)" : "1px dashed var(--border)",
              background: draft.full.thumbnailUrl ? `center/cover no-repeat url(${JSON.stringify(draft.full.thumbnailUrl)})` : "var(--surface-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, color: "var(--text-3)", fontWeight: 600,
            }}
          >
            {draft.full.thumbnailUrl ? "" : "No image"}
          </div>
          <div>
            <input ref={fullThumbRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickFullThumb(f); e.target.value = ""; }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className={styles.secondaryBtn} disabled={fullThumbBusy || busy} onClick={() => fullThumbRef.current?.click()}>
                {fullThumbBusy ? "Uploading…" : draft.full.thumbnailUrl ? "Replace image" : "Upload image"}
              </button>
              {draft.full.thumbnailUrl && (
                <button className={styles.quietBtn} disabled={fullThumbBusy || busy} onClick={() => setFull({ thumbnailUrl: "" })}>Remove</button>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--text-3)", marginTop: 8, maxWidth: 380 }}>
              Large photos are resized automatically before uploading. Leave empty to show a plain background instead.
            </div>
            {fullThumbError && <div style={{ fontSize: 12, color: "var(--danger, #B4232A)", marginTop: 6 }}>{fullThumbError}</div>}
          </div>
        </div>
      </div>

      {!hasShowVideo && chapterCount > 0 && (
        <div style={{ marginBottom: 14, background: "var(--warn-tint, #FFF4E5)", color: "var(--warn, #8A5A00)", padding: "10px 14px", borderRadius: "var(--r-sm)", fontSize: 13 }}>
          {chapterCount} {chapterCount === 1 ? "dance is" : "dances are"} set to play a section of the show video, but no full-show Bunny video ID is set above — those dances won&apos;t play until it is.
        </div>
      )}

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 11 }}>
        <span className={styles.cardTitle}>Individual performances</span>
        <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>Class clips, watched one by one</span>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: "-3px 0 12px" }}>
        Missing images can be generated from ten seconds after each performance starts. Click any image to upload your own replacement.
      </p>

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
            <button className={styles.primaryBtn} disabled={busy || !bulk.trim()} onClick={() => structural(async () => { const r = await bulkAddPerformances(showId, slug, bulk); setMsg("error" in r ? r.error : (r.message ?? "Added.")); setBulk(""); setBulkOpen(false); })}>Add all</button>
            <button className={styles.secondaryBtn} onClick={() => setBulkOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className={styles.card} style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 1080 }}>
          <div style={{ display: "grid", gridTemplateColumns: GRID, gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-3)" }}>
            <span></span><span>Image</span><span>Title</span><span>Group</span><span>Style</span><span>Video</span><span>Source detail</span><span>Length</span><span></span>
          </div>
          {draft.rows.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 18, textTransform: "uppercase" }}>No performances yet</div>
              <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>Add them one by one, or paste a list to add several.</p>
            </div>
          ) : draft.rows.map((p, i) => (
            <Row
              key={p.id}
              perf={p}
              index={i}
              total={draft.rows.length}
              slug={slug}
              showId={showId}
              groups={groups}
              styleCats={styleCats}
              busy={busy}
              onChange={(patch) => setRow(p.id, patch)}
              onReorder={(dir) => structural(() => reorderPerformance(p.id, slug, dir))}
              onRemove={() => structural(() => removePerformance(p.id, slug))}
              onRefresh={() => router.refresh()}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function Row({
  perf: p, index: i, total, slug, showId, groups, styleCats, busy, onChange, onReorder, onRemove, onRefresh,
}: {
  perf: PerfRow; index: number; total: number; slug: string; showId: string;
  groups: Cat[]; styleCats: Cat[]; busy: boolean;
  onChange: (patch: Partial<PerfRow>) => void;
  onReorder: (dir: -1 | 1) => void;
  onRemove: () => void;
  onRefresh: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isChapter = p.videoSource === "show";

  /** Images save on pick rather than waiting for Save — there's no half-typed
   *  state to protect, and holding a File in the draft would be awkward. */
  async function onPickFile(file: File) {
    setErr(null);
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > MAX_IMAGE_BYTES) { setErr(tooLargeMessage(MAX_IMAGE_BYTES)); return; }
      const fd = new FormData();
      fd.append("file", compressed);
      const r = await uploadPerformanceThumbnail(p.id, showId, slug, fd);
      if ("error" in r) { setErr(r.error); return; }
      onRefresh();
    } catch {
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
          <button className={styles.quietBtn} style={{ padding: 1, border: "none" }} disabled={busy || i === 0} onClick={() => onReorder(-1)}>▲</button>
          <button className={styles.quietBtn} style={{ padding: 1, border: "none" }} disabled={busy || i === total - 1} onClick={() => onReorder(1)}>▼</button>
        </div>

        <div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickFile(f); }} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || busy}
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

        <input style={cell} value={p.title} onChange={(e) => onChange({ title: e.target.value })} />

        <select className={styles.select} style={{ padding: "7px 8px", fontSize: 13 }} value={p.groupId} onChange={(e) => onChange({ groupId: e.target.value })}>
          <option value="">—</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <select className={styles.select} style={{ padding: "7px 8px", fontSize: 13 }} value={p.styleId} onChange={(e) => onChange({ styleId: e.target.value })}>
          <option value="">—</option>
          {styleCats.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select
          className={styles.select}
          style={{ padding: "7px 8px", fontSize: 13 }}
          value={p.videoSource}
          onChange={(e) => onChange({ videoSource: e.target.value as "show" | "standalone" })}
        >
          <option value="show">Show video</option>
          <option value="standalone">Separate video</option>
        </select>

        {isChapter ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input style={timeInput} value={p.clipStart} placeholder="00:00:00" onChange={(e) => onChange({ clipStart: e.target.value })} />
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>→</span>
            <input style={timeInput} value={p.clipEnd} placeholder="00:00:00" onChange={(e) => onChange({ clipEnd: e.target.value })} />
          </div>
        ) : (
          <input style={mono} value={p.bunnyVideoId} placeholder="Bunny video ID" onChange={(e) => onChange({ bunnyVideoId: e.target.value })} />
        )}

        {isChapter ? (
          <span style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center" }} title="Worked out from the start and end times">
            {p.duration || "—"}
          </span>
        ) : (
          <input style={{ ...cell, textAlign: "center" }} value={p.duration} placeholder="—" onChange={(e) => onChange({ duration: e.target.value })} />
        )}

        <button className={styles.dangerBtn} disabled={busy} onClick={() => setConfirmOpen(true)}>Del</button>
      </div>
      {err && (
        <div style={{ padding: "0 16px 9px 112px", fontSize: 12, color: "var(--danger, #B4232A)" }}>{err}</div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Remove this performance?"
        body={`"${p.title.trim() || "Untitled"}" will be removed from this show.`}
        consequences={["Its group and style tags go with it", "Any uploaded image for it is no longer used"]}
        confirmLabel="Remove"
        busy={busy}
        onConfirm={() => { setConfirmOpen(false); onRemove(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
