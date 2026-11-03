import { NextResponse } from "next/server";
import { z } from "zod";

import { ROLE_COOKIE, ROLES, roleCookie } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The mock sign-in: there is no password, token or server session. The role is one cookie, and the alerts
// route reads it, so "Executives can't edit alerts" is enforced where the data is written, not only in the UI.

const Body = z.object({ role: z.enum(ROLES) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Body must be { role: 'executive' | 'analyst' }" },
      { status: 400 },
    );
  }
  const res = NextResponse.json({ role: parsed.data.role });
  res.cookies.set(roleCookie(parsed.data.role));
  return res;
}

/** Sign out: forget the persona. */
export async function DELETE() {
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(ROLE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
