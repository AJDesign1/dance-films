import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import AdminLoginForm from "./AdminLoginForm";
import styles from "./login.module.css";

export const metadata = { title: "Admin sign in · Dance Films" };

export default async function AdminLoginPage() {
  // Already an admin session → straight through.
  const profile = await getProfile();
  if (profile?.is_admin) redirect("/admin");

  return (
    <div data-brand="compact" className={styles.wrap}>
      <div className={styles.card}>
        {/* Stacked logo — the primary mark, for login/welcome screens */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/DanceFilms_logo_stacked.svg"
          alt="Dance Films"
          className={styles.logo}
        />
        <h1 className={styles.heading}>Admin sign in</h1>
        <p className={styles.sub}>
          Manage schools, shows and access across the platform.
        </p>
        <AdminLoginForm />
      </div>
    </div>
  );
}
