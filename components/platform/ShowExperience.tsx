"use client";

import { useMemo, useState, type CSSProperties } from "react";
import styles from "@/app/(platform)/show/[slug]/show.module.css";
import { getEmbedUrl } from "@/app/(platform)/show/[slug]/embed-actions";

export type PerfItem = {
  id: string; // DB uuid — safe to expose; vimeo_id is NOT sent to the client
  title: string;
  thumbnailUrl: string | null;
  duration: string;
  group: string | null;
  style: string | null;
};

type Props = {
  showTitle: string;
  showYear: number | null;
  showId: string;
  fullShowAvailable: boolean;
  fullShowDuration: string;
  performances: PerfItem[];
  groups: string[];
  styles: string[];
};

type Viewing = { type: "full" } | { type: "perf"; id: string } | null;

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const noContextMenu = (e: React.MouseEvent) => e.preventDefault();

export default function ShowExperience({
  showTitle,
  showYear,
  showId,
  fullShowAvailable,
  fullShowDuration,
  performances,
  groups,
  styles: styleList,
}: Props) {
  const [filter, setFilter] = useState<{ kind: "group" | "style" | null; value: string | null }>({
    kind: null,
    value: null,
  });
  const [viewing, setViewing] = useState<Viewing>(null);
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const visible = useMemo(() => {
    if (!filter.kind) return performances;
    return performances.filter((p) =>
      filter.kind === "group" ? p.group === filter.value : p.style === filter.value,
    );
  }, [performances, filter]);

  const count = (kind: "group" | "style", value: string) =>
    performances.filter((p) => (kind === "group" ? p.group === value : p.style === value)).length;

  const perfIndex = viewing?.type === "perf" ? visible.findIndex((p) => p.id === viewing.id) : -1;
  const curPerf = perfIndex >= 0 ? visible[perfIndex] : null;
  const hasPrev = perfIndex > 0;
  const hasNext = perfIndex >= 0 && perfIndex < visible.length - 1;

  async function play(v: Viewing) {
    setViewing(v);
    setEmbedUrl(null);
    if (!v) return;
    setLoading(true);
    const url = v.type === "full" ? await getEmbedUrl("full", showId) : await getEmbedUrl("perf", v.id);
    setEmbedUrl(url);
    setLoading(false);
  }

  const step = (d: number) => {
    const n = perfIndex + d;
    if (n >= 0 && n < visible.length) play({ type: "perf", id: visible[n].id });
  };

  const close = () => {
    setViewing(null);
    setEmbedUrl(null);
  };

  return (
    <div className={styles.body}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
        The full show
      </div>
      <button
        onClick={() => fullShowAvailable && play({ type: "full" })}
        style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: "var(--r-lg)", overflow: "hidden", background: "#0a1119", boxShadow: "var(--card-shadow)", border: "none", cursor: fullShowAvailable ? "pointer" : "default", padding: 0 }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, var(--brand-2), var(--ink))" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,17,25,.2),rgba(10,17,25,.6))", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ width: 74, height: 74, borderRadius: "var(--r-pill)", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(0,0,0,.35)" }}>
            <svg width="26" height="26" viewBox="0 0 16 16" fill="#fff"><path d="M4 3l9 5-9 5V3z" /></svg>
          </div>
        </div>
        <div style={{ position: "absolute", left: 20, bottom: 18, textAlign: "left", pointerEvents: "none" }}>
          <div className={styles.fullTitle} style={{ fontFamily: "var(--disp)", fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase", color: "#fff" }}>
            {showTitle} {showYear ?? ""} — full show
          </div>
          {fullShowDuration && <div style={{ fontSize: 12.5, color: "#c0ccd6", marginTop: 5 }}>{fullShowDuration}</div>}
        </div>
      </button>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, margin: "52px 0 6px" }}>
        <h2 style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 32, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--text)", margin: 0 }}>
          Performances
        </h2>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-2)", whiteSpace: "nowrap" }}>
          {visible.length === performances.length ? `${performances.length} dances` : `${visible.length} of ${performances.length}`}
        </span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: "16px 0 4px" }}>
        <button onClick={() => setFilter({ kind: null, value: null })} style={chip(!filter.kind)}>All dances</button>
        {groups.map((g) => (
          <button key={g} onClick={() => setFilter({ kind: "group", value: g })} style={chip(filter.kind === "group" && filter.value === g)}>
            {g} · {count("group", g)}
          </button>
        ))}
      </div>
      {styleList.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-2)", marginRight: 2 }}>Style</span>
          {styleList.map((st) => (
            <button key={st} onClick={() => setFilter({ kind: "style", value: st })} style={chip(filter.kind === "style" && filter.value === st)}>
              {st} · {count("style", st)}
            </button>
          ))}
        </div>
      )}

      <div className={styles.progGrid} style={{ marginTop: 10 }}>
        {visible.map((p) => (
          <button key={p.id} className={styles.progRow} onClick={() => play({ type: "perf", id: p.id })}>
            <div className={styles.progNum}>{pad2(performances.indexOf(p) + 1)}</div>
            <div className={styles.progThumb}>
              {p.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbnailUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, var(--brand-2), var(--ink))" }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(10,17,25,.05),rgba(10,17,25,.4))" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 34, height: 34, borderRadius: "var(--r-pill)", background: "rgba(255,255,255,.95)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="#1B2A33"><path d="M4 3l9 5-9 5V3z" /></svg>
                </div>
              </div>
            </div>
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <div className={styles.progTitle} style={{ fontFamily: "var(--disp)", fontWeight: 700, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--text)", lineHeight: 1 }}>
                {p.title}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-2)", marginTop: 8, display: "flex", flexWrap: "wrap", gap: "5px 12px" }}>
                {p.group && <span>{p.group}</span>}
                {p.style && <span style={{ color: "var(--accent)", fontWeight: 600 }}>{p.style}</span>}
                {p.duration && <span>{p.duration}</span>}
              </div>
            </div>
          </button>
        ))}
        {visible.length === 0 && (
          <div style={{ padding: "30px 0", color: "var(--text-2)", fontSize: 14 }}>No dances in this group.</div>
        )}
      </div>

      {viewing && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.overlayTop}>
            <button onClick={close} style={backBtn}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M13 8H4M7 4L3 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back to show
            </button>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: "#8aa0b3" }}>
              {viewing.type === "perf" && perfIndex >= 0 ? `${pad2(perfIndex + 1)} / ${pad2(visible.length)}` : "Full show"}
            </div>
            <button onClick={close} aria-label="Close" style={{ ...backBtn, width: 42, height: 42, padding: 0, justifyContent: "center", fontSize: 20 }}>×</button>
          </div>
          <div className={styles.overlayScroll}>
            <div className={styles.overlayStage}>
              <div className={styles.player} onContextMenu={noContextMenu}>
                {loading ? (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8aa0b3", fontSize: 13 }}>Loading…</div>
                ) : embedUrl ? (
                  <iframe
                    src={embedUrl}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={viewing.type === "full" ? `${showTitle} — full show` : curPerf?.title ?? "Performance"}
                  />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8aa0b3", fontSize: 14 }}>
                    No video available.
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 18, marginTop: 24 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>
                    {viewing.type === "full" ? "Full show" : `Performance ${curPerf ? pad2(performances.indexOf(curPerf) + 1) : ""}`}
                  </div>
                  <h2 className={styles.viewTitle} style={{ fontFamily: "var(--disp)", fontWeight: 800, letterSpacing: ".01em", textTransform: "uppercase", color: "#fff", margin: "8px 0 0" }}>
                    {viewing.type === "full" ? `${showTitle} ${showYear ?? ""} — full show` : curPerf?.title}
                  </h2>
                  {viewing.type === "perf" && curPerf && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12, fontSize: 12.5, fontWeight: 600, color: "#c9d4da" }}>
                      {curPerf.group && <span>{curPerf.group}</span>}
                      {curPerf.style && <span style={{ color: "var(--accent)" }}>{curPerf.style}</span>}
                      {curPerf.duration && <span style={{ color: "#8aa0b3" }}>{curPerf.duration}</span>}
                    </div>
                  )}
                </div>
                {viewing.type === "perf" && (
                  <div style={{ display: "flex", gap: 10, flex: "0 0 auto" }}>
                    <button onClick={() => step(-1)} disabled={!hasPrev} style={navBtn(hasPrev)}>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      Prev
                    </button>
                    <button onClick={() => step(1)} disabled={!hasNext} style={navBtn(hasNext)}>
                      Next
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M6 3l4 5-4 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                )}
              </div>
              {viewing.type === "perf" && hasNext && (
                <div style={{ marginTop: 16, fontSize: 12.5, color: "#6d8296" }}>
                  Up next · <span style={{ color: "#aebccb", fontWeight: 600 }}>{visible[perfIndex + 1].title}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function chip(active: boolean): CSSProperties {
  return {
    fontSize: 12.5,
    fontWeight: 600,
    letterSpacing: ".01em",
    padding: "8px 13px",
    borderRadius: "var(--r-sm)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "var(--body)",
    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "var(--on-accent)" : "var(--text)",
  };
}

const backBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".1em",
  textTransform: "uppercase",
  padding: "11px 15px",
  borderRadius: "var(--r-sm)",
  border: "1px solid rgba(255,255,255,.18)",
  background: "rgba(255,255,255,.05)",
  color: "#fff",
  cursor: "pointer",
};

function navBtn(enabled: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: ".06em",
    textTransform: "uppercase",
    padding: "13px 17px",
    borderRadius: 9,
    fontFamily: "var(--body)",
    border: enabled ? "1px solid var(--accent)" : "1px solid rgba(255,255,255,.1)",
    background: enabled ? "var(--accent-tint)" : "transparent",
    color: enabled ? "var(--accent)" : "#4c5e6e",
    cursor: enabled ? "pointer" : "not-allowed",
  };
}
