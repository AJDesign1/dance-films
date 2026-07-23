import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOnboardedProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

/**
 * Stage 4 stub. Proves entitlement gating end-to-end:
 *  - owned  → placeholder for the real show page (hero + gated video + library, Stage 5)
 *  - not owned → buy prompt (real Stripe checkout wired in Stage 6)
 */
export default async function ShowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOnboardedProfile();
  const school = await getCurrentSchool();
  const supabase = await createClient();

  const { data: show } = await supabase
    .from("shows")
    .select("id, slug, title, show_year, season, price_pence")
    .eq("school_id", school!.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!show) notFound();

  // Ownership: can we read the entitlement-gated full-show video? (RLS decides.)
  const { data: video } = await supabase
    .from("show_videos")
    .select("show_id")
    .eq("show_id", show.id)
    .maybeSingle();
  const owned = !!video;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 560, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", boxShadow: "var(--card-shadow)", padding: "40px 36px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)" }}>
          {show.season ?? "Show"}{show.show_year ? ` · ${show.show_year}` : ""}
        </div>
        <h1 style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 52, lineHeight: ".9", letterSpacing: ".01em", textTransform: "uppercase", color: "var(--text)", margin: "12px 0 14px" }}>
          {show.title}
        </h1>
        {owned ? (
          <p style={{ color: "var(--text-2)", fontSize: "var(--fs-body)", lineHeight: 1.55, margin: 0 }}>
            You <strong style={{ color: "var(--success)" }}>own</strong> this show — the full-show video and every
            performance become watchable here in Stage 5.
          </p>
        ) : (
          <p style={{ color: "var(--text-2)", fontSize: "var(--fs-body)", lineHeight: 1.55, margin: 0 }}>
            You don&apos;t own this show yet. Buy it for{" "}
            <strong style={{ color: "var(--text)" }}>{formatPrice(show.price_pence)}</strong> — checkout is wired in
            Stage 6. RLS is hiding the video refs until then.
          </p>
        )}
        <div style={{ marginTop: 24 }}>
          <Link href="/shows" style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--accent)" }}>
            ← All shows
          </Link>
        </div>
      </div>
    </div>
  );
}
