import styles from "./coming-soon.module.css";

// Served by middleware for any request with no resolved school subdomain
// (the apex domain, the raw Netlify domain, etc). Standalone marketing
// placeholder until the real marketing site is built — see docs/Dance Show
// Platform - Master Brief.md.
export default function ComingSoonPage() {
  return (
    <div className={styles.wrap}>
      <div className={styles.wordmark}>Dance Films</div>
      <p className={styles.tagline}>
        A home for your school&rsquo;s filmed shows. Platforms are launching
        school by school — find yours at your school&rsquo;s own address.
      </p>
    </div>
  );
}
