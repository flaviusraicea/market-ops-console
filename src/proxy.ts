import { NextResponse, type NextRequest } from "next/server";

import { DEFAULT_ROLE, ROLE_COOKIE, defaultModeFor, parseRole, roleCookie } from "@/lib/roles";

/**
 * Runs before every page request. Three jobs:
 * 1. Links written before the mode was renamed (`mode=overview`) are redirected for good to `mode=executive`.
 * 2. An address always names its view: `/` without a `mode` is redirected to the signed-in role's view, other
 *    parameters kept, so a copied link shows what its sender saw.
 * 3. A first visit is signed in as the default persona, on the request as well as the response, so the very
 *    first server render already knows the role. The sign-in screen and the API are left alone: signing out
 *    must stay signed out until a persona is picked.
 */
export function proxy(request: NextRequest) {
  const { nextUrl } = request;

  if (nextUrl.searchParams.get("mode") === "overview") {
    const target = nextUrl.clone();
    target.searchParams.set("mode", "executive");
    return NextResponse.redirect(target, 308);
  }

  if (nextUrl.pathname === "/sign-in" || nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const role = parseRole(request.cookies.get(ROLE_COOKIE)?.value);
  const needsMode = nextUrl.pathname === "/" && !nextUrl.searchParams.has("mode");
  if (role) {
    if (!needsMode) return NextResponse.next();
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
  const response = NextResponse.next({ request });
  response.cookies.set(cookie);
  return response;
}

export const config = {
  // Everything except Next's own assets and static files.
  matcher: ["/((?!_next/|favicon\\.ico|.*\\.[a-z0-9]+$).*)"],
};
