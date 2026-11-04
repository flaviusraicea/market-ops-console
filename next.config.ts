import type { NextConfig } from "next";

const IMMUTABLE = "public, max-age=31536000, immutable";
// The page is built for the signed-in role (a cookie), so a shared cache must never keep a copy, and the browser
// asks again every time.
const PER_USER = "private, no-cache";

// Sent with every response: a script or stylesheet is only ever run as its declared type. The headers that
// only mean something on a document (the policy, framing, referrer, permissions) are set on pages by the
// proxy (src/proxy.ts, lib/csp.ts), so the 30-odd script responses of a view do not each carry them.
const SECURITY = [{ key: "X-Content-Type-Options", value: "nosniff" }];

const nextConfig: NextConfig = {
  // No "X-Powered-By: Next.js": it tells a scanner which exploits to try and tells a user nothing.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY },
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
