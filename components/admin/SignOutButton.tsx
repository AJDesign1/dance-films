import styles from "@/app/(admin)/admin/[slug]/admin.module.css";

/**
 * Sign out of the admin, returning to the admin's own password sign-in rather
 * than a school's parent magic-link screen.
 *
 * A plain form post (no client JS) so it works in both the school admin sidebar
 * and the master admin's, and keeps working if hydration hasn't finished.
 */
export default function SignOutButton() {
  return (
    <form action="/auth/signout" method="post" style={{ margin: 0 }}>
      <input type="hidden" name="next" value="/admin/login" />
      <button
        type="submit"
        className={styles.backLink}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15 17l5-5-5-5M20 12H9M12 3H5v18h7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Sign out</span>
      </button>
    </form>
  );
}
