import { requireOnboardedProfile } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getCurrentSchool } from "@/lib/school";
import { createClient } from "@/lib/supabase/server";
import { firstName } from "@/lib/format";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Footer from "@/components/platform/Footer";
import FeaturedShow from "@/components/platform/FeaturedShow";
import CoverImage from "@/components/platform/CoverImage";
import ShowCard, { type ShopShow } from "@/components/platform/ShowCard";
import styles from "./shop.module.css";
import { imageMetadata } from "@/lib/media";
import { ImageMetadataProvider } from "@/components/platform/ImageMetadata";
import SchoolQuote from "./SchoolQuote";
import SchoolGallery from "./SchoolGallery";

type ShowsPageRow = Omit<ShopShow, "owned"> & { id: string; owned: boolean };

export default async function ShowsPage() {
  const schoolPromise = getCurrentSchool();
  // The RPC uses the caller's cookies and RLS. It can run while the profile
  // gate is in flight; nothing is rendered until both have completed.
  const pagePromise = Promise.all([schoolPromise, createClient()]).then(([school, supabase]) => {
    if (!school) notFound();
    return supabase.rpc("get_shows_page", { p_school_id: school.id });
  });
  const [profile, school, { data, error }] = await Promise.all([
    requireOnboardedProfile(),
    schoolPromise,
    pagePromise,
  ]);
  if (error) throw new Error("Unable to load shows");
  const showRows = (data ?? []) as unknown as ShowsPageRow[];

  const shows: ShopShow[] = showRows.map((s) => ({
    slug: s.slug,
    title: s.title,
    show_year: s.show_year,
    season: s.season,
    price_pence: s.price_pence,
    sale_price_pence: s.sale_price_pence,
    artwork_url: s.artwork_url,
    owned: s.owned,
    status: s.status,
  }));

  const featured = shows[0];
  const rest = shows.slice(1);
  const schoolName = school?.name ?? "Dance Films";
  const images = school ? await imageMetadata(school.id, [...shows.map(s => s.artwork_url), school.about_image_url, ...(school.gallery_image_urls ?? [])].filter((u): u is string => !!u)) : {};

  return (
    <ImageMetadataProvider images={images}><div style={{ background: "var(--surface)" }}>
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
        <SchoolGallery images={school?.gallery_image_urls ?? []} schoolName={schoolName} />
      </div>

      <SchoolQuote text={school?.quote_text ?? null} name={school?.quote_name ?? null} role={school?.quote_role ?? null} />

      <Footer schoolName={schoolName} logoWhiteUrl={school?.logo_white_url ?? null} />
    </div></ImageMetadataProvider>
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
