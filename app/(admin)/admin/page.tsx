import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { initials } from "@/lib/format";
import AdminHeader from "@/components/admin/AdminHeader";
import SchoolsManager, { type SchoolRow } from "@/components/admin/SchoolsManager";
import styles from "./[slug]/admin.module.css";

export default async function MasterAdmin() {
  const profile = await requireAdmin();
  const admin = createAdminClient();
  const { data: schools } = await admin
    .from("schools")
    .select("id, name, slug, platform_name, status, theme")
    .order("created_at", { ascending: true });

  const rows: SchoolRow[] = (schools ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    platformName: s.platform_name,
    primary: (s.theme as { primary?: string } | null)?.primary ?? "#13D1C4",
    status: s.status,
  }));

  const deferred = ["Marketing", "Blog", "SEO", "Enquiries"];

  return (
    <div data-admin className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand} style={{ borderTop: "none", paddingTop: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/DanceFilms_logo_stacked.svg" alt="Dance Films" className={styles.sidebarLogo} />
          <div className={styles.sidebarSchool}>Master admin</div>
        </div>
        <nav className={styles.nav}>
          <span className={`${styles.navItem} ${styles.navItemActive}`}><span>Schools</span></span>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--text-3)", padding: "16px 12px 6px" }}>Marketing site · later</div>
          {deferred.map((d) => (
            <span key={d} className={styles.navItem} style={{ opacity: 0.5, cursor: "default" }}><span>{d}</span></span>
          ))}
        </nav>
        <div className={styles.sidebarFoot} style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ flex: "0 0 auto", width: 36, height: 36, borderRadius: "var(--r-pill)", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{initials(profile.name ?? profile.email)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name ?? "Admin"}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.email}</div>
          </div>
        </div>
      </aside>
      <main className={styles.main}>
        <AdminHeader title="Schools" />
        <div className={styles.content}>
          <SchoolsManager schools={rows} />
        </div>
      </main>
    </div>
  );
}
