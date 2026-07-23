import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage (branding/artwork/thumbnails) + Vimeo poster frames.
    // Real hosts are wired per-environment; keep the allowlist tight.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
    ],
  },
};

export default nextConfig;
