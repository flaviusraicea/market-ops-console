import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_ROLE, ROLE_COOKIE, defaultModeFor, parseRole, roleCookie } from "@/lib/roles";
import { DOCUMENT_HEADERS, NONCE_HEADER, contentSecurityPolicy } from "@/lib/csp";

/**
 * Runs before every page request. Two jobs:
 * 1. An address always names its view: `/` without a `mode` is redirected to the signed-in role's view, other
 *    parameters kept, so a copied link shows what its sender saw.
 * 2. A first visit is signed in as the default persona, on the request as well as the response, so the very
 *    first server render already knows the role. The sign-in screen and the API are left alone: signing out
 *    must stay signed out until a persona is picked.
 * Every page it lets through gets a Content-Security-Policy with a fresh nonce (lib/csp.ts). Next reads the
 * nonce from the request's policy and puts it on its own inline scripts; the layout puts it on the theme script.
 */
export function proxy(request: NextRequest) {
  const { nextUrl } = request;

  if (nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  if (nextUrl.pathname === "/sign-in") return withPolicy(request);

  const role = parseRole(request.cookies.get(ROLE_COOKIE)?.value);
  const needsMode = nextUrl.pathname === "/" && !nextUrl.searchParams.has("mode");
  if (role) {
    if (!needsMode) return withPolicy(request);
    const target = nextUrl.clone();
    target.searchParams.set("mode", defaultModeFor(role));
    return NextResponse.redirect(target, 307);
  }

  const cookie = roleCookie(DEFAULT_ROLE);
  request.cookies.set(cookie.name, cookie.value);
  if (needsMode) {
    const target = nextUrl.clone();
    target.searchParams.set("mode", defaultModeFor(DEFAULT_ROLE));
    const redirect = NextResponse.redirect(target, 307);
    redirect.cookies.set(cookie);
    return redirect;
  }
  const response = withPolicy(request);
  response.cookies.set(cookie);
  return response;
}

/** Passes the page on with this request's policy, on the request (for Next and the layout) and the response. */
function withPolicy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  // Copied after any cookie set above, so a first visit's role still reaches the server render.
  const headers = new Headers(request.headers);
  headers.set(NONCE_HEADER, nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  for (const [name, value] of DOCUMENT_HEADERS) response.headers.set(name, value);
  return response;
}

export const config = {
  // Everything except Next's own assets and static files.
  matcher: ["/((?!_next/|favicon\\.ico|.*\\.[a-z0-9]+$).*)"],
};
