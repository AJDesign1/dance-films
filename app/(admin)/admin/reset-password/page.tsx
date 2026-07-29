import styles from "../login/login.module.css";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { title: "Set password · Dance Films" };

/**
 * Landing page for Supabase's password-recovery email link. That link carries
 * the session as a URL hash fragment (#access_token=...&type=recovery), never
 * sent to the server — so this is a client component: the browser Supabase
 * client picks the fragment up on load (detectSessionInUrl) and turns it into
 * a real session, which ResetPasswordForm then uses to set a new password.
 */
export default function ResetPasswordPage() {
  return (
    <div data-brand="compact" className={styles.wrap}>
      <div className={styles.card}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/DanceFilms_logo_stacked.svg"
          alt="Dance Films"
          className={styles.logo}
        />
        <h1 className={styles.heading}>Set your password</h1>
        <p className={styles.sub}>Choose a password for your admin account.</p>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
