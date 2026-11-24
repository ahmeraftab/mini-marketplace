import type { NextConfig } from "next";

// Remote images come from our own Supabase Storage bucket only.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "*.supabase.co";
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Pages that read the database render on every request (no stale listings),
  // so the Cache Components / partial-prefetch flags are deliberately left off.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Every size x format the optimiser makes is one more full download from
    // Supabase Storage, which counts against its egress quota. Product photos
    // never change in place (a new upload gets a new path), so: one modern
    // format, a short list of widths, and keep the results for 31 days.
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1080, 1600],
    imageSizes: [96, 256, 384],
    minimumCacheTTL: 2678400,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The service worker must never be served from a stale cache.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
