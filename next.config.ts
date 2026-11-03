import type { NextConfig } from "next";

const IMMUTABLE = "public, max-age=31536000, immutable";
const REVALIDATE = "public, max-age=0, must-revalidate";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The geometry file is named by its content hash (scripts/build-geo.ts), so it never changes in place.
      { source: "/geo/:path*", headers: [{ key: "Cache-Control", value: IMMUTABLE }] },
      // /_next/static is already immutable. The page is dynamic (the URL is the state): always revalidate.
      { source: "/", headers: [{ key: "Cache-Control", value: REVALIDATE }] },
      // Answers and alerts are per request: never cached by the browser or a CDN.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
