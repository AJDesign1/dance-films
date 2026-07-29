import styles from "./coming-soon.module.css";

export const metadata = {
  title: "Dance Films",
  description: "Modern dance show filming, made for schools & families.",
};

// Served by middleware for any request with no resolved school subdomain (the
// apex domain, the raw Netlify domain, etc). Brand-led placeholder until the
// real marketing site is built — see docs/Dance Show Platform - Master Brief.md.
export default function ComingSoonPage() {
  return (
    <div data-brand className={styles.wrap}>
      <div className={styles.inner}>
        {/* Stacked logo — the primary mark (DESIGN_GUIDE §4) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/DanceFilms_logo_stacked.svg"
          alt="Dance Films"
          className={styles.logo}
        />
        <h1 className={styles.strapline}>
          Capturing the energy of your{" "}
          <span className={styles.accent}>dance show</span>.
        </h1>
        <p className={styles.supporting}>
          Modern dance show filming, made for schools &amp; families. Each
          school has its own private home for its films — use the link your
          school sent you to sign in and watch.
        </p>
        <p className={styles.note}>Full site coming soon</p>
      </div>
    </div>
  );
}
