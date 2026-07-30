import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-mode overlay button (the floating "N") so it doesn't sit over content.
  devIndicators: false,
  images: {
    // Supabase Storage (branding/artwork/thumbnails) + Bunny Stream poster
    // frames/thumbnails. *.b-cdn.net is Bunny's default CDN domain — update
    // this if a custom CDN hostname is configured instead.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.b-cdn.net" },
    ],
  },
};

export default nextConfig;
