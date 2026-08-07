import { requireOnboardedProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { firstName } from "@/lib/format";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Footer from "@/components/platform/Footer";
import FeaturedShow from "@/components/platform/FeaturedShow";
import CoverImage from "@/components/platform/CoverImage";
import ShowCard, { type ShopShow } from "@/components/platform/ShowCard";
import styles from "./shop.module.css";

export default async function ShowsPage() {
  const profile = await requireOnboardedProfile();
  const school = await getCurrentSchool();
  const supabase = await createClient();

  // Published shows for this school (RLS: invited + published), and the user's
  // own entitlements (RLS: own rows only). Independent of each other, so they
  // run concurrently rather than as two sequential round trips.
  const [{ data: showRows }, { data: entRows }] = await Promise.all([
    supabase
      .from("shows")
      .select("id, slug, title, show_year, season, price_pence, artwork_url")
      .eq("school_id", school!.id)
      .eq("status", "published")
      .order("sort_order", { ascending: true }),
    supabase.from("entitlements").select("show_id"),
  ]);

  // Selecting `id` above removed a third query that re-read `shows` purely to
  // map entitlement show_ids back to slugs.
  const ownedIds = new Set((entRows ?? []).map((e) => e.show_id));

  const shows: ShopShow[] = (showRows ?? []).map((s) => ({
    slug: s.slug,
    title: s.title,
    show_year: s.show_year,
    season: s.season,
    price_pence: s.price_pence,
    artwork_url: s.artwork_url,
    // Admin previews every show fully unlocked, regardless of entitlement —
    // RLS already allows admin to read the gated tables either way.
    owned: ownedIds.has(s.id) || profile.is_admin,
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

        <AboutSchool schoolName={schoolName} text={school?.about_text ?? null} imageUrl={school?.about_image_url ?? null} />
      </div>

      <MediaTeam
        name={school?.team_name ?? null}
        role={school?.team_role ?? null}
        bio={school?.team_bio ?? null}
        tagline={school?.team_tagline ?? null}
        imageUrl={school?.team_image_url ?? null}
      />

      <Footer schoolName={schoolName} logoWhiteUrl={school?.logo_white_url ?? null} />
    </div>
  );
}

/**
 * "About <school>" — copy left, photo right. Editable per school at
 * /admin/{slug}/school-page; hidden entirely until the school adds something,
 * so a new school never shows an empty band.
 */
function AboutSchool({
  schoolName,
  text,
  imageUrl,
}: {
  schoolName: string;
  text: string | null;
  imageUrl: string | null;
}) {
  if (!text && !imageUrl) return null;

  return (
    <section className={`${styles.about} ${imageUrl ? "" : styles.aboutNoPhoto}`}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)" }}>
          Our school
        </div>
        <h2 className={styles.aboutTitle}>About {schoolName}</h2>
        {text && <p className={styles.aboutText}>{text}</p>}
      </div>
      {imageUrl && (
        <div className={styles.aboutPhoto}>
          <CoverImage src={imageUrl} sizes="(max-width: 820px) 100vw, 560px" />
        </div>
      )}
    </section>
  );
}

/** Media-team band — full-width. Same per-school editing/hiding rules as above. */
function MediaTeam({
  name,
  role,
  bio,
  tagline,
  imageUrl,
}: {
  name: string | null;
  role: string | null;
  bio: string | null;
  tagline: string | null;
  imageUrl: string | null;
}) {
  if (!name && !bio && !imageUrl) return null;

  return (
    <section className={styles.team}>
      <div className={styles.teamPhoto}>
        {imageUrl ? (
          <CoverImage src={imageUrl} alt={name ?? ""} sizes="(max-width: 640px) 100vw, 50vw" />
        ) : (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, var(--surface-2), var(--brand-2))" }} />
        )}
      </div>
      <div className={styles.teamBody}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--accent)" }}>
          Meet the media team
        </div>
        {name && (
          <h2 style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 34, letterSpacing: ".01em", textTransform: "uppercase", color: "var(--brand-2)", margin: "12px 0 4px" }}>
            {name}
          </h2>
        )}
        {role && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-2)" }}>{role}</div>}
        {bio && <p className={styles.teamBio}>{bio}</p>}
        {tagline && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <span style={{ flex: "0 0 auto", width: 7, height: 7, borderRadius: "var(--r-pill)", background: "var(--accent)", marginTop: 7 }} />
            <span style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{tagline}</span>
          </div>
        )}
      </div>
    </section>
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
