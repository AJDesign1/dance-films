/** Inherits the surrounding school's or admin's existing theme. */
export default function RouteLoading() {
  return (
    <div role="status" aria-live="polite" style={{ padding: "var(--sp-7) var(--sp-5)", color: "var(--text)", fontFamily: "var(--body)" }}>
      <p style={{ margin: "0 0 var(--sp-5)", fontWeight: 600 }}>Loading…</p>
      <div aria-hidden="true" style={{ display: "grid", gap: "var(--sp-4)" }}>
        {["100%", "70%", "45%"].map((width) => (
          <div key={width} style={{ width, height: "var(--sp-5)", borderRadius: "var(--r-sm)", background: "var(--surface-2)" }} />
        ))}
      </div>
    </div>
  );
}
