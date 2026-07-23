import { headers } from "next/headers";
import { SCHOOL_SLUG_HEADER, DEFAULT_SCHOOL_SLUG } from "@/lib/tenant";

/**
 * Stage 0 smoke test — confirms the scaffold runs, fonts load, the token
 * system applies, and the subdomain → school resolution works.
 * Replaced by the real /login → /shows routing in later stages.
 */
export default async function Home() {
  const h = await headers();
  const slug = h.get(SCHOOL_SLUG_HEADER) ?? DEFAULT_SCHOOL_SLUG;

  return (
    <div
      data-app
      data-theme="dark"
      style={{ minHeight: "100vh", background: "var(--desk)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--card-shadow)",
          padding: "40px 36px",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)" }}>
          Dance Films · Stage 0
        </div>
        <h1
          style={{
            fontFamily: "var(--disp)",
            fontWeight: 800,
            fontSize: 56,
            lineHeight: ".92",
            letterSpacing: ".01em",
            textTransform: "uppercase",
            color: "var(--text)",
            margin: "16px 0 8px",
          }}
        >
          Scaffold live
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: "var(--fs-body)", lineHeight: 1.55, margin: 0 }}>
          Next.js + Supabase skeleton is running. Fonts, the CSS-variable token
          system and per-subdomain tenant resolution are wired.
        </p>
        <div
          style={{
            marginTop: 24,
            padding: "14px 16px",
            borderRadius: "var(--r-md)",
            background: "var(--surface-2)",
            fontSize: 13,
            color: "var(--text-2)",
          }}
        >
          Resolved school:{" "}
          <strong style={{ color: "var(--accent)", fontWeight: 700 }}>{slug}</strong>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          {(["var(--brand)", "var(--brand-2)", "var(--accent-warm)", "var(--success)"] as const).map((c) => (
            <span key={c} style={{ flex: 1, height: 40, borderRadius: "var(--r-sm)", background: c }} />
          ))}
        </div>
      </div>
    </div>
  );
}
