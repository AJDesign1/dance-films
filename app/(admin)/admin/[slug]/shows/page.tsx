import AdminHeader from "@/components/admin/AdminHeader";
import styles from "../admin.module.css";

export default function ShowsPlaceholder() {
  return (
    <>
      <AdminHeader title="Shows" />
      <div className={styles.content}>
        <div className={`${styles.card} ${styles.cardPad}`} style={{ maxWidth: 520 }}>
          <div style={{ fontFamily: "var(--disp)", fontWeight: 700, fontSize: 20, textTransform: "uppercase" }}>Coming in the next slice</div>
          <p style={{ color: "var(--text-2)", fontSize: 14, margin: "8px 0 0" }}>
            The shows section is being built next. Dashboard, Invited parents and Users &amp; access are live now.
          </p>
        </div>
      </div>
    </>
  );
}
