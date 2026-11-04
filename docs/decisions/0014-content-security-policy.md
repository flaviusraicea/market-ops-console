# 0014. A nonce Content-Security-Policy and the standard security headers

Status: accepted, decided on 2026-11-04.

## Context

The console renders text from an assistant and from data files, so a cross-site scripting bug would run with the signed-in role. A Content-Security-Policy limits what such a bug can do. The page is already rendered per request (the role is a cookie), so a per-request value costs no caching.

## Options

- A hash of the theme script in a static policy. Next streams its own inline scripts (the React Server Components payload), and their content changes with every page, so no fixed list of hashes covers them.
- A per-request nonce, set by the proxy. Next reads it from the request's policy and puts it on its own scripts.
- `'unsafe-inline'` for scripts, which gives no protection against injected scripts.

## Decision

`src/proxy.ts` sets a fresh nonce on every page, in the request (for Next and the layout's theme script) and on the response. `src/lib/csp.ts` builds the policy:

- scripts from this origin with the nonce, plus `'strict-dynamic'` so those scripts can load lazy chunks and Speed Insights;
- styles allow inline, because React, Radix positioning and the chart transforms set `style` attributes, which a nonce cannot cover;
- every fetch is same-origin;
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`;
- development adds `'unsafe-eval'` and the hot-reload socket.

`next.config.ts` sends `X-Content-Type-Options: nosniff` on every response. The proxy adds the headers that only mean something on a document to every page: `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` and a `Permissions-Policy` that turns off camera, microphone, geolocation, payment and USB. Sending them on each of a view's 30-odd script responses would cost about 5 KB of transfer for nothing. `poweredByHeader: false` drops `X-Powered-By`.

## Consequences

`tests/e2e/security-headers.spec.ts` checks the headers, that every inline script carries this request's nonce, and that the Analyst view loads with no policy violation. A new third-party script or a fetch to another origin now fails until the policy names it.
