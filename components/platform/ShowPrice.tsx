import { formatPrice } from "@/lib/format";

export type PricedShow = {
  price_pence: number;
  sale_price_pence: number | null;
};

export function effectiveShowPrice(show: PricedShow): number {
  return show.sale_price_pence ?? show.price_pence;
}

export default function ShowPrice({
  show,
  color = "var(--text)",
  saleColor = "var(--danger)",
  showTag = true,
}: {
  show: PricedShow;
  color?: string;
  saleColor?: string;
  showTag?: boolean;
}) {
  if (show.sale_price_pence === null) return <>{formatPrice(show.price_pence)}</>;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
      <span style={{ color, opacity: 0.72, textDecoration: "line-through", textDecorationThickness: "1.5px" }}>
        {formatPrice(show.price_pence)}
      </span>
      <span style={{ color: saleColor }}>{formatPrice(show.sale_price_pence)}</span>
      {showTag && (
        <span style={{ padding: "3px 7px", borderRadius: "var(--r-sm)", background: "var(--danger)", color: "#fff", fontSize: "0.68em", fontWeight: 800, letterSpacing: ".08em", lineHeight: 1.2, textTransform: "uppercase" }}>
          Sale
        </span>
      )}
    </span>
  );
}
