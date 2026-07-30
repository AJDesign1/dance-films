"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/app/(admin)/admin/[slug]/admin.module.css";

type Item = { key: string; label: string; href: string; badge?: number };

export default function AdminSidebar({
  slug,
  schoolName,
  invitedPending,
}: {
  slug: string;
  schoolName: string;
  invitedPending: number;
}) {
  const pathname = usePathname();
  const base = `/admin/${slug}`;

  const items: Item[] = [
    { key: "branding", label: "Branding & config", href: `${base}/branding` },
    { key: "dashboard", label: "Dashboard", href: base },
    { key: "shows", label: "Shows", href: `${base}/shows` },
    { key: "categories", label: "Categories", href: `${base}/categories` },
    { key: "parents", label: "Invited parents", href: `${base}/parents`, badge: invitedPending || undefined },
    { key: "access-codes", label: "Access codes", href: `${base}/access-codes` },
    { key: "users", label: "Users & access", href: `${base}/users` },
  ];

  const isActive = (href: string) =>
    href === base ? pathname === base : pathname.startsWith(href);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTop}>
        <Link href="/admin" className={styles.backLink}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L6 8l4 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>Back to all schools</span>
        </Link>
      </div>
      <div className={styles.sidebarBrand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/DanceFilms_logo_stacked.svg" alt="Dance Films" className={styles.sidebarLogo} />
        <div className={styles.sidebarWord} style={{ marginTop: 14 }}>{schoolName}</div>
        <div className={styles.sidebarSchool}>School admin</div>
      </div>
      <nav className={styles.nav}>
        {items.map((it) => (
          <Link key={it.key} href={it.href} className={`${styles.navItem} ${isActive(it.href) ? styles.navItemActive : ""}`}>
            <span>{it.label}</span>
            {it.badge ? <span className={styles.navBadge}>{it.badge}</span> : null}
          </Link>
        ))}
      </nav>
      <div className={styles.sidebarFoot}>
        <a href={`/?school=${slug}`} target="_blank" rel="noreferrer" className={styles.backLink}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 3h6v6M21 3l-9 9M14 4H4v16h16V10" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <span>View live site</span>
        </a>
      </div>
    </aside>
  );
}
