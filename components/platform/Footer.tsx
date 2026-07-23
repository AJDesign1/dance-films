/**
 * Platform footer — school copyright + the discreet, persistent Dance Films
 * credit (links out to the marketing site once it exists).
 */
export default function Footer({
  schoolName,
  logoWhiteUrl,
}: {
  schoolName: string;
  logoWhiteUrl: string | null;
}) {
  return (
    <div style={{ background: "var(--brand-2)", padding: "26px 22px 30px" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          maxWidth: 1280,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {logoWhiteUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoWhiteUrl} alt={schoolName} style={{ height: 28, filter: "brightness(0) invert(1)" }} />
          ) : (
            <span style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, textTransform: "uppercase", color: "#fff" }}>
              {schoolName}
            </span>
          )}
          <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>© {schoolName}</span>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12, color: "rgba(255,255,255,.6)" }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="1.5" y="4" width="9" height="8" rx="1.5" />
            <path d="M10.5 7l4-2v6l-4-2" />
          </svg>
          Filmed &amp; delivered by <span style={{ color: "#fff", fontWeight: 700 }}>Dance Films</span>
        </span>
      </div>
    </div>
  );
}
