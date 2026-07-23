import AccountMenu from "@/components/platform/AccountMenu";
import styles from "@/app/(platform)/shows/shop.module.css";

/**
 * Themed platform header: gradient bar (secondary → accent), school logo (or
 * wordmark fallback) on the left, account menu on the right.
 */
export default function PlatformHeader({
  schoolName,
  logoWhiteUrl,
  name,
  email,
}: {
  schoolName: string;
  logoWhiteUrl: string | null;
  name: string | null;
  email: string;
}) {
  return (
    <div className={styles.headBar}>
      <div className={styles.headInner}>
        {logoWhiteUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.logo} src={logoWhiteUrl} alt={schoolName} />
        ) : (
          <span className={styles.logoWord}>{schoolName}</span>
        )}
        <AccountMenu name={name} email={email} />
      </div>
    </div>
  );
}
