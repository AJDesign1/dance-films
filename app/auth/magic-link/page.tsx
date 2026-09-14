import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentSchool } from "@/lib/school";
import { safeAuthNext } from "@/lib/auth-redirect";
import { themeMode, themeToCssVars } from "@/lib/theme";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Finish signing in | Dance Films",
};

type MagicLinkPageProps = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
};

export default async function MagicLinkPage({ searchParams }: MagicLinkPageProps) {
  const params = await searchParams;
  const school = await getCurrentSchool();
  const theme = school?.theme ?? {};
  const tokenHash = params.token_hash;
  const otpType = params.type;
  const isValid = Boolean(tokenHash && otpType);

  return (
    <main
      data-app
      data-theme={themeMode(theme)}
      className={styles.page}
      style={themeToCssVars(theme)}
    >
      <section className={styles.card} aria-labelledby="magic-link-title">
        {school?.logo_white_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={school.logo_white_url}
            alt={school.name}
            className={styles.schoolLogo}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand/DanceFilms_logo_linear.svg"
            alt="Dance Films"
            className={styles.danceFilmsLogo}
          />
        )}

        {isValid ? (
          <>
            <p className={styles.eyebrow}>Secure sign in</p>
            <h1 id="magic-link-title">Finish signing in</h1>
            <p className={styles.copy}>
              Press the button below to securely sign in to {school?.name ?? "Dance Films"}.
            </p>
            <form method="get" action="/auth/confirm">
              <input type="hidden" name="token_hash" value={tokenHash} />
              <input type="hidden" name="type" value={otpType} />
              <input type="hidden" name="next" value={safeAuthNext(params.next)} />
              <button type="submit" className={styles.button}>
                Sign in
              </button>
            </form>
            <p className={styles.note}>This link can only be used once and expires shortly.</p>
          </>
        ) : (
          <>
            <p className={styles.eyebrow}>Sign-in link</p>
            <h1 id="magic-link-title">This link isn&apos;t valid</h1>
            <p className={styles.copy}>
              Return to the login page and request a fresh link.
            </p>
            <Link href="/login" className={styles.button}>
              Back to login
            </Link>
          </>
        )}
      </section>
    </main>
  );
}
