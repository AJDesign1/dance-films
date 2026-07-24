import Link from "next/link";
import { getManagedSchool } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/format";
import AdminHeader from "@/components/admin/AdminHeader";
import styles from "./admin.module.css";

export default async function AdminDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = (await getManagedSchool(slug))!;
  const admin = createAdminClient();

  const [{ count: showCount }, { count: publishedCount }, { data: invites }, { data: recentOrders }] =
    await Promise.all([
      admin.from("shows").select("id", { count: "exact", head: true }).eq("school_id", school.id),
      admin.from("shows").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("status", "published"),
      admin.from("invited_emails").select("status").eq("school_id", school.id),
      admin
        .from("orders")
        .select("amount_pence, created_at, status, shows!inner(title, school_id), profiles(name, email)")
        .eq("shows.school_id", school.id)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const invited = invites ?? [];
  const signedUp = invited.filter((i) => i.status === "registered").length;
  const pct = invited.length ? Math.round((signedUp / invited.length) * 100) : 0;
  const revenue = (recentOrders ?? []).reduce((s, o) => s + (o.amount_pence ?? 0), 0);

  const stats = [
    { label: "Shows", value: showCount ?? 0, sub: `${publishedCount ?? 0} published` },
    { label: "Invited parents", value: invited.length, sub: `${invited.length - signedUp} not yet signed up` },
    { label: "Signed up", value: signedUp, sub: `${pct}% of invited` },
    { label: "Recent revenue", value: formatPrice(revenue), sub: "last 5 sales" },
  ];

  return (
    <>
      <AdminHeader title="Dashboard" />
      <div className={styles.content}>
        <div className={styles.statGrid}>
          {stats.map((s) => (
            <div key={s.label} className={`${styles.card} ${styles.cardPad}`}>
              <div className={styles.statLabel}>{s.label}</div>
              <div className={styles.statValue}>{s.value}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 6, fontWeight: 600 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 22 }}>
          <div className={styles.card} style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <div className={styles.cardTitle}>Recent purchases</div>
              <Link href={`/admin/${slug}/users`} className={styles.quietBtn}>All users</Link>
            </div>
            {(recentOrders ?? []).length === 0 ? (
              <div style={{ padding: "24px 20px", color: "var(--text-2)", fontSize: 14 }}>No purchases yet.</div>
            ) : (
              (recentOrders ?? []).map((o, i) => {
                const show = Array.isArray(o.shows) ? o.shows[0] : o.shows;
                const prof = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 20px", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{show?.title ?? "Show"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-2)" }}>{prof?.name ?? prof?.email ?? "Parent"}</div>
                    </div>
                    <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 18, color: "var(--success)" }}>{formatPrice(o.amount_pence ?? 0)}</div>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.card} style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }} className={styles.cardTitle}>Parents</div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 38, lineHeight: 1 }}>{signedUp}</span>
                <span style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 6 }}>of {invited.length} invited signed up</span>
              </div>
              <div style={{ marginTop: 14, height: 10, borderRadius: "var(--r-pill)", background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ height: "100%", background: "var(--accent)", width: `${pct}%` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--text-2)" }}>
                <span>{pct}% activated</span>
                <Link href={`/admin/${slug}/parents`} className={styles.quietBtn}>Manage invites</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
