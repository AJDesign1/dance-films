import { getCurrentSchool } from "@/lib/school";

/**
 * Stage 2 proof — everything on this page (brand colours, platform name, theme
 * mode) is sourced from the school's `theme` jsonb in the DB, applied via the
 * layout's CSS-variable overrides. Nothing is hard-coded. Replaced by the real
 * /login → /shows routing in later stages.
 */
export default async function Home() {
  const school = await getCurrentSchool();

  if (!school) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <p style={{ color: "var(--text-2)", fontFamily: "var(--body)" }}>
          No school found for this address.
        </p>
      </div>
    );
  }

  const t = school.theme;
  const swatches: Array<[string, string | undefined]> = [
    ["primary", t.primary],
    ["secondary", t.secondary],
    ["accent", t.accentWarm],
    ["ink", t.ink],
    ["paper", t.paper],
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--card-shadow)",
          padding: "40px 36px",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "var(--accent)" }}>
          {school.name} · Stage 2 · theme from DB
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
          {school.platform_name ?? school.name}
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: "var(--fs-body)", lineHeight: 1.55, margin: "0 0 24px" }}>
          Colours, typography and light/dark are loaded from{" "}
          <code style={{ color: "var(--accent)" }}>schools.theme</code> for{" "}
          <strong style={{ color: "var(--text)" }}>{school.slug}</strong> and applied as CSS
          variables. Swap the subdomain (or the DB row) and the whole platform reskins.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {swatches.map(([label, value]) => (
            <div key={label} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 48, borderRadius: "var(--r-sm)", background: value ?? "transparent", border: "1px solid var(--border)" }} />
              <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--text-2)" }}>
                {label}
              </div>
              <div style={{ fontSize: 10, fontFamily: "ui-monospace, monospace", color: "var(--text-2)" }}>
                {value ?? "—"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
