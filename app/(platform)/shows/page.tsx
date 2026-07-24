import { requireOnboardedProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { firstName } from "@/lib/format";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Footer from "@/components/platform/Footer";
import FeaturedShow from "@/components/platform/FeaturedShow";
import ShowCard, { type ShopShow } from "@/components/platform/ShowCard";
import styles from "./shop.module.css";

export default async function ShowsPage() {
  const profile = await requireOnboardedProfile();
  const school = await getCurrentSchool();
  const supabase = await createClient();

  // Published shows for this school (RLS: invited + published). Ordered for display.
  const { data: showRows } = await supabase
    .from("shows")
    .select("slug, title, show_year, season, price_pence, artwork_url")
    .eq("school_id", school!.id)
    .eq("status", "published")
    .order("sort_order", { ascending: true });

  // The user's entitlements (RLS: own rows only) → owned lookup.
  const { data: entRows } = await supabase.from("entitlements").select("show_id");
  const { data: idRows } = await supabase.from("shows").select("id, slug").eq("school_id", school!.id);
  const slugById = new Map((idRows ?? []).map((r) => [r.id, r.slug]));
  const ownedSlugs = new Set((entRows ?? []).map((e) => slugById.get(e.show_id)).filter(Boolean) as string[]);

  const shows: ShopShow[] = (showRows ?? []).map((s) => ({
    slug: s.slug,
    title: s.title,
    show_year: s.show_year,
    season: s.season,
    price_pence: s.price_pence,
    artwork_url: s.artwork_url,
    owned: ownedSlugs.has(s.slug),
  }));

  const featured = shows[0];
  const rest = shows.slice(1);
  const schoolName = school?.name ?? "Dance Films";

  return (
    <div style={{ background: "var(--surface)" }}>
      <PlatformHeader schoolName={schoolName} logoWhiteUrl={school?.logo_white_url ?? null} name={profile.name} email={profile.email} />

      <div className={styles.body}>
        <div className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>Your {schoolName} shows</h1>
          <p style={{ margin: "12px 0 0", color: "var(--accent)", fontSize: 21, fontWeight: 600 }}>
            Ready to watch whenever you are.
          </p>
        </div>

        {shows.length === 0 ? (
          <EmptyShows />
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
              Latest production
            </div>
            <FeaturedShow show={featured} email={profile.email} />

            {rest.length > 0 && (
              <>
                <div className={styles.seasonGap} style={{ margin: undefined }}>
                  <h3 style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 30, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--text)", margin: 0 }}>
                    All shows
                  </h3>
                  <p style={{ margin: "5px 0 18px", color: "var(--text-2)", fontSize: 14.5 }}>
                    Every show we&apos;ve filmed, ready to watch whenever you like.
                  </p>
                </div>
                <div className={styles.grid}>
                  {rest.map((s) => (
                    <ShowCard key={s.slug} show={s} email={profile.email} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>

      {/* Meet the media team — full-width band (placeholder copy; see Stage 4 notes) */}
      <div className={styles.team}>
        <div className={styles.teamPhoto}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, var(--surface-2), var(--brand-2))" }} />
        </div>
        <div className={styles.teamBody}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>
            Meet the media team
          </div>
          <h2 style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 34, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--brand-2)", margin: "12px 0 4px" }}>
            Alex Jarvis
          </h2>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>Founder, Dance Films</div>
          <p style={{ margin: "16px 0 0", color: "var(--text-2)", fontSize: 15, lineHeight: 1.6, maxWidth: "52ch" }}>
            Alex is the videographer behind Dance Films, capturing dance shows with a
            cinematic eye for the moments that matter. [Placeholder — final copy to follow.]
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <span style={{ flex: "0 0 auto", width: 7, height: 7, borderRadius: "var(--r-pill)", background: "var(--accent)", marginTop: 7 }} />
            <span style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>
              Multi-camera capture, colour-graded for a cinematic finish.
            </span>
          </div>
        </div>
      </div>

      <Footer schoolName={schoolName} logoWhiteUrl={school?.logo_white_url ?? null} />
    </div>
  );
}

function EmptyShows() {
  return (
    <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--surface-2)", borderRadius: 16 }}>
      <div style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 28, textTransform: "uppercase", color: "var(--text)" }}>
        No shows yet
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 15, margin: "10px 0 0" }}>
        Your school hasn&apos;t published any shows yet — check back soon.
      </p>
    </div>
  );
}
