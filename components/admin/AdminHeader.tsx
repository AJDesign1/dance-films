import Link from "next/link";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";

/** Sticky admin page header: optional breadcrumb, title, optional right-side action. */
export default function AdminHeader({
  title,
  crumb,
  crumbHref,
  action,
}: {
  title: string;
  crumb?: string;
  crumbHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {crumb && crumbHref && (
          <>
            <Link href={crumbHref} className={styles.crumb}>{crumb}</Link>
            <span style={{ color: "var(--border-2)" }}>/</span>
          </>
        )}
        <h1 className={styles.pageTitle}>{title}</h1>
      </div>
      {action ? <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>{action}</div> : null}
    </header>
  );
}
