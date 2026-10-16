import AccountMenu from "@/components/platform/AccountMenu";
import Link from "next/link";
import { MetadataImage } from "./ImageMetadata";
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
        <Link href="/" aria-label={`${schoolName} homepage`} prefetch={false} style={{ display: "inline-flex" }}>
          {logoWhiteUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <MetadataImage className={styles.logo} src={logoWhiteUrl} alt={schoolName} />
          ) : (
            <span className={styles.logoWord}>{schoolName}</span>
          )}
        </Link>
        <AccountMenu name={name} email={email} />
      </div>
    </div>
  );
}
