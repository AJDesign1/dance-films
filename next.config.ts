import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-mode overlay button (the floating "N") so it doesn't sit over content.
  devIndicators: false,
  experimental: {
    // Image uploads go through Server Actions, whose request body defaults to a
    // 1MB cap — smaller than the 2MB (branding/photos) and 5MB (show artwork)
    // the upload actions themselves advertise. Anything over 1MB was rejected by
    // the framework before the action ran, which surfaced as a thrown action
    // rather than a returned error. Raised above the largest advertised limit,
    // with headroom for multipart encoding overhead.
    serverActions: { bodySizeLimit: "8mb" },
  },
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
