/** The request header the proxy passes this request's nonce on in, for the layout's inline script. */
export const NONCE_HEADER = "x-nonce";

/**
 * The console's Content-Security-Policy. Scripts run only from this origin or with this request's nonce;
 * `'strict-dynamic'` lets those scripts load their own chunks (Next's lazy chunks, Speed Insights). Styles allow
 * inline because React, Radix positioning and the chart transforms set `style` attributes, which a nonce cannot
 * cover. Everything the page fetches (answers, alerts, vitals, the map geometry) is same-origin. The page may
 * not be framed. Development adds what React's dev tooling and hot reload need: eval and the HMR socket.
 */
export function contentSecurityPolicy(nonce: string, dev = false): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(dev ? ["ws:"] : [])],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Headers that only apply to a document, sent with every page. X-Frame-Options repeats frame-ancestors for
 * browsers that predate it.
 */
export const DOCUMENT_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ["X-Frame-Options", "DENY"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()"],
];
