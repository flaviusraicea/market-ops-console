import type { NextConfig } from "next";

const IMMUTABLE = "public, max-age=31536000, immutable";
// The page is built for the signed-in role (a cookie), so a shared cache must never keep a copy, and the browser
// asks again every time.
const PER_USER = "private, no-cache";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // The geometry file is named by its content hash (scripts/build-geo.ts), so it never changes in place.
      { source: "/geo/:path*", headers: [{ key: "Cache-Control", value: IMMUTABLE }] },
      // /_next/static is already immutable. The page is dynamic: the URL is the state and the role picks the view.
      { source: "/", headers: [{ key: "Cache-Control", value: PER_USER }] },
      // Answers and alerts are per request: never cached by the browser or a CDN.
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
