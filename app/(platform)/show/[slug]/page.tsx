import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOnboardedProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, formatRuntime } from "@/lib/format";
import Footer from "@/components/platform/Footer";
import BuyButton from "@/components/platform/BuyButton";
import ShowExperience, { type PerfItem } from "@/components/platform/ShowExperience";
import { publicPosterSrc } from "@/lib/publicPoster";
import CoverImage from "@/components/platform/CoverImage";
import ShowPrice from "@/components/platform/ShowPrice";
import styles from "./show.module.css";

type ShowPageBundle = {
  show: {
    id: string;
    slug: string;
    title: string;
    show_year: number | null;
    season: string | null;
    intro_text: string | null;
    artwork_url: string | null;
    price_pence: number;
    sale_price_pence: number | null;
  };
  owned: boolean;
  video?: {
    duration_seconds: number | null;
    has_full_show: boolean;
    has_thumbnail: boolean;
  } | null;
  downloaded?: boolean;
  performances?: Array<{
    id: string;
    title: string;
    has_thumbnail: boolean;
    duration_seconds: number | null;
    category_ids: string[];
  }>;
  categories?: Array<{
    id: string;
    name: string;
    kind: "group" | "style";
  }>;
};

export default async function ShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { slug } = await params;
  const { purchase } = await searchParams;
  const schoolPromise = getCurrentSchool();
  // RLS protects this query independently of the onboarding gate. Start it
  // as soon as the tenant is known instead of waiting for the profile query.
  const pagePromise = Promise.all([schoolPromise, createClient()]).then(([school, supabase]) => {
    if (!school) notFound();
    return supabase.rpc("get_show_page", {
      p_school_id: school.id,
      p_show_slug: slug,
    });
  });
  // Poster URLs for the grid, in parallel with the bundle (RLS returns rows
  // only for an owned show). Supabase-hosted posters become direct CDN URLs —
  // see lib/publicPoster.ts; hidden rows or Bunny-hosted posters fall back to
  // the gated /api/thumbnail proxy when the grid is built below.
  const postersPromise = Promise.all([schoolPromise, createClient()]).then(([school, supabase]) =>
    school
      ? supabase
          .from("performances")
          .select("id, thumbnail_url, shows!inner(school_id, slug)")
          .eq("shows.school_id", school.id)
          .eq("shows.slug", slug)
      : null,
  );
  const [profile, school, { data, error }, posters] = await Promise.all([
    requireOnboardedProfile(),
    schoolPromise,
    pagePromise,
    postersPromise,
  ]);
  if (error) throw new Error("Unable to load show");
  const bundle = data as unknown as ShowPageBundle | null;

  if (!bundle) notFound();

  const { show, owned } = bundle;

  const schoolName = school?.name ?? "Dance Films";
  const logoWhite = school?.logo_white_url ?? null;

  // ---- Header (over hero) ----
  const header = (
    <div className={styles.headBar}>
      <div className={styles.headInner}>
        {logoWhite ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.headLogo} src={logoWhite} alt={schoolName} />
        ) : (
          <span className={styles.headWord}>{schoolName}</span>
        )}
        <Link
          href="/shows"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", padding: "9px 14px", borderRadius: "var(--r-sm)", border: "1px solid rgba(255,255,255,.32)", background: "rgba(12,20,26,.4)", backdropFilter: "blur(6px)", color: "#fff" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 8H4M7 4L3 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          All shows
        </Link>
      </div>
    </div>
  );

  if (!owned) {
    return (
      <div style={{ background: "var(--surface)", minHeight: "100vh" }}>
        {header}
        <Hero show={show} runtime="" perfCount={null} />
        <div className={styles.body}>
          <div style={{ maxWidth: 520, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "28px 26px" }}>
            <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 24, textTransform: "uppercase", color: "var(--text)" }}>
              This show is locked
            </div>
            <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.55, margin: "10px 0 18px" }}>
              Buy <strong style={{ color: "var(--text)" }}>{show.title}</strong> for{" "}
              <strong style={{ color: "var(--text)" }}><ShowPrice show={show} /></strong> to watch the full show
              and every performance. Checkout is wired in Stage 6.
            </p>
            <BuyButton
              show={{ slug: show.slug, title: show.title, show_year: show.show_year, price_pence: show.price_pence, sale_price_pence: show.sale_price_pence }}
              email={profile.email}
            />
          </div>
        </div>
        <Footer schoolName={schoolName} logoWhiteUrl={logoWhite} />
      </div>
    );
  }

  // ---- Owned: gated content arrived in the same database response ----
  const video = bundle.video;
  const perfRows = bundle.performances ?? [];
  const catRows = bundle.categories ?? [];

  const catById = new Map((catRows ?? []).map((c) => [c.id, c]));

  const directPoster = new Map(
    (posters?.data ?? []).map((r) => [r.id, publicPosterSrc(r.thumbnail_url, 400)]),
  );

  const performances: PerfItem[] = (perfRows ?? []).map((p) => {
    const cats = p.category_ids.map((id) => catById.get(id)).filter(Boolean);
    const group = cats.find((c) => c!.kind === "group")?.name ?? null;
    const style = cats.find((c) => c!.kind === "style")?.name ?? null;
    return {
      id: p.id,
      title: p.title,
      // A Supabase-hosted poster goes into markup directly (public bucket, no
      // video id in the URL). A Bunny-hosted one carries the video id, so only
      // the gated proxy path is exposed (see /api/thumbnail).
      posterSrc: directPoster.get(p.id) ?? (p.has_thumbnail ? `/api/thumbnail/perf/${p.id}` : null),
      duration: formatDuration(p.duration_seconds),
      group,
      style,
    };
  });

  const groups = (catRows ?? []).filter((c) => c.kind === "group").map((c) => c.name);
  const styleList = (catRows ?? []).filter((c) => c.kind === "style").map((c) => c.name);

  return (
    <div style={{ background: "var(--surface)" }}>
      {header}
      <Hero show={show} runtime={formatRuntime(video?.duration_seconds)} perfCount={performances.length} />
      {purchase === "success" && (
        <div style={{ background: "var(--success)", color: "#fff", textAlign: "center", padding: "12px 20px", fontSize: 14, fontWeight: 600 }}>
          Purchase complete — {show.title} is now yours to watch. Enjoy the show!
        </div>
      )}
      <ShowExperience
        showTitle={show.title}
        showYear={show.show_year}
        showId={show.id}
        intro={show.intro_text}
        fullShowAvailable={!!video?.has_full_show}
        fullShowDuration={formatRuntime(video?.duration_seconds)}
        fullShowHasThumbnail={!!video?.has_thumbnail}
        alreadyDownloaded={!!bundle.downloaded}
        performances={performances}
        groups={groups}
        styles={styleList}
      />
      <Footer schoolName={schoolName} logoWhiteUrl={logoWhite} />
    </div>
  );
}

function Hero({
  show,
  runtime,
  perfCount,
}: {
  show: { title: string; season: string | null; show_year: number | null; artwork_url: string | null };
  runtime: string;
  perfCount: number | null;
}) {
  return (
    <div className={styles.hero}>
      {show.artwork_url ? (
        // Full-bleed hero, above the fold — prioritised, not lazy-loaded.
        <CoverImage src={show.artwork_url} sizes="100vw" priority position="left center" />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, var(--brand-2), var(--ink))" }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(12,20,26,.12) 0%,rgba(12,20,26,.4) 48%,rgba(12,20,26,.92) 100%)", pointerEvents: "none" }} />
      <div className={styles.heroInner}>
        <div className={styles.heroPad}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#fff", opacity: 0.85 }}>
            {show.season ?? "Show"}{show.show_year ? ` · ${show.show_year}` : ""}
          </div>
          <h1 className={styles.heroTitle} style={{ fontFamily: "var(--disp)", fontWeight: 800, letterSpacing: ".01em", textTransform: "uppercase", color: "#fff", margin: "12px 0 16px" }}>
            {show.title}
          </h1>
          {(runtime || perfCount !== null) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "center", fontSize: 13, fontWeight: 600, color: "#c9d4da" }}>
              {runtime && <span>Runtime <span style={{ color: "#fff" }}>{runtime}</span></span>}
              {runtime && perfCount !== null && <span style={{ opacity: 0.4 }}>·</span>}
              {perfCount !== null && <span><span style={{ color: "#fff" }}>{perfCount}</span> performances</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
