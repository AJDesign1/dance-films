import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOnboardedProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { formatPrice, formatDuration, formatRuntime } from "@/lib/format";
import Footer from "@/components/platform/Footer";
import BuyButton from "@/components/platform/BuyButton";
import ShowExperience, { type PerfItem } from "@/components/platform/ShowExperience";
import styles from "./show.module.css";

export default async function ShowPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ purchase?: string }>;
}) {
  const { slug } = await params;
  const { purchase } = await searchParams;
  const profile = await requireOnboardedProfile();
  const school = await getCurrentSchool();
  const supabase = await createClient();

  const { data: show } = await supabase
    .from("shows")
    .select("id, slug, title, show_year, season, intro_text, artwork_url, price_pence")
    .eq("school_id", school!.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!show) notFound();

  // Ownership via the user's own entitlement row (RLS: own rows only).
  const { data: ent } = await supabase
    .from("entitlements")
    .select("id")
    .eq("show_id", show.id)
    .maybeSingle();
  const owned = !!ent;

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
              <strong style={{ color: "var(--text)" }}>{formatPrice(show.price_pence)}</strong> to watch the full show
              and every performance. Checkout is wired in Stage 6.
            </p>
            <BuyButton
              show={{ slug: show.slug, title: show.title, show_year: show.show_year, price_pence: show.price_pence }}
              email={profile.email}
            />
          </div>
        </div>
        <Footer schoolName={schoolName} logoWhiteUrl={logoWhite} />
      </div>
    );
  }

  // ---- Owned: load gated content ----
  const { data: video } = await supabase
    .from("show_videos")
    .select("full_show_vimeo_id, duration_seconds")
    .eq("show_id", show.id)
    .maybeSingle();

  const { data: perfRows } = await supabase
    .from("performances")
    .select("id, title, thumbnail_url, duration_seconds, sort_order")
    .eq("show_id", show.id)
    .order("sort_order", { ascending: true });

  const { data: catRows } = await supabase
    .from("categories")
    .select("id, name, kind, sort_order")
    .eq("show_id", show.id)
    .order("sort_order", { ascending: true });

  const perfIds = (perfRows ?? []).map((p) => p.id);
  const { data: linkRows } = perfIds.length
    ? await supabase.from("performance_categories").select("performance_id, category_id").in("performance_id", perfIds)
    : { data: [] as { performance_id: string; category_id: string }[] };

  const catById = new Map((catRows ?? []).map((c) => [c.id, c]));
  const linksByPerf = new Map<string, string[]>();
  for (const l of linkRows ?? []) {
    const arr = linksByPerf.get(l.performance_id) ?? [];
    arr.push(l.category_id);
    linksByPerf.set(l.performance_id, arr);
  }

  const performances: PerfItem[] = (perfRows ?? []).map((p) => {
    const cats = (linksByPerf.get(p.id) ?? []).map((id) => catById.get(id)).filter(Boolean);
    const group = cats.find((c) => c!.kind === "group")?.name ?? null;
    const style = cats.find((c) => c!.kind === "style")?.name ?? null;
    return {
      id: p.id,
      title: p.title,
      thumbnailUrl: p.thumbnail_url,
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
        fullShowAvailable={!!video?.full_show_vimeo_id}
        fullShowDuration={formatRuntime(video?.duration_seconds)}
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
        // eslint-disable-next-line @next/next/no-img-element
        <img src={show.artwork_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, var(--brand-2), var(--ink))" }} />
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(12,20,26,.12) 0%,rgba(12,20,26,.4) 48%,rgba(12,20,26,.92) 100%)", pointerEvents: "none" }} />
      <div className={styles.heroPad}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#fff", opacity: 0.85 }}>
          {show.season ?? "Show"}{show.show_year ? ` · ${show.show_year}` : ""}
        </div>
        <h1 className={styles.heroTitle} style={{ fontFamily: "var(--disp)", fontWeight: 800, lineHeight: ".86", letterSpacing: ".01em", textTransform: "uppercase", color: "#fff", margin: "12px 0 16px" }}>
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
  );
}
