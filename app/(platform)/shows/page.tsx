import { requireOnboardedProfile } from "@/lib/auth";
import { getCurrentSchool } from "@/lib/school";

/**
 * Stage 3 placeholder — proves the auth gate: unauthenticated visitors are
 * redirected to /login, un-named users to /welcome. Replaced by the real
 * unified shop (featured + grid, owned/buy states) in Stage 5.
 */
export default async function ShowsPage() {
  const profile = await requireOnboardedProfile();
  const school = await getCurrentSchool();
  const firstName = profile.name?.split(" ")[0] ?? "there";

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--card-shadow)",
          padding: "40px 36px",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)" }}>
          {school?.name ?? "Dance Films"} · signed in
        </div>
        <h1
          style={{
            fontFamily: "var(--disp)",
            fontWeight: 800,
            fontSize: 48,
            lineHeight: ".92",
            letterSpacing: ".01em",
            textTransform: "uppercase",
            color: "var(--text)",
            margin: "16px 0 8px",
          }}
        >
          Welcome back, {firstName}
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: "var(--fs-body)", lineHeight: 1.55, margin: "0 0 24px" }}>
          Auth is working — you&apos;re signed in as{" "}
          <strong style={{ color: "var(--text)" }}>{profile.email}</strong>. The unified shop
          (owned / buy states) lands in Stage 5.
        </p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            style={{
              padding: "12px 18px",
              borderRadius: "var(--r-md)",
              border: "1.5px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              fontFamily: "var(--disp)",
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: ".03em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
