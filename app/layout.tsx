import type { Metadata } from "next";
import { Big_Shoulders, Hanken_Grotesk } from "next/font/google";
import "./globals.css";

// Liberty's default type pairing, self-hosted via next/font.
// Exposed as CSS variables the token system references (--font-display / --font-body).
// "Big Shoulders" is the current name for what the design called "Big Shoulders
// Display" (Google merged the family). Both are variable fonts, so we take the
// full weight axis rather than pinning instances.
const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-big-shoulders",
  display: "swap",
  // Metric fallbacks aren't published for this family; we define our own stack in CSS.
  adjustFontFallback: false,
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dance Films",
  description:
    "Relive the show, whenever you like — professionally filmed dance shows to watch online.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${hanken.variable}`}>
      <body>{children}</body>
    </html>
  );
}
