import type { NextConfig } from "next";

const IMMUTABLE = "public, max-age=31536000, immutable";
// The page is built for the signed-in role (a cookie), so a shared cache must never keep a copy, and the browser
// asks again every time.
const PER_USER = "private, no-cache";

// Sent with every response. The Content-Security-Policy carries a per-request nonce, so the proxy sets it on
// pages (src/proxy.ts). X-Frame-Options repeats its frame-ancestors for browsers that predate it.
const SECURITY = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

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
