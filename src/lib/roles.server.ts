import { cookies } from "next/headers";

import { DEFAULT_ROLE, ROLE_COOKIE, parseRole, type Role } from "./roles";

/** The signed-in role for this request: the cookie, or the default persona when it is absent or unknown. */
export async function readRole(): Promise<Role> {
  return parseRole((await cookies()).get(ROLE_COOKIE)?.value) ?? DEFAULT_ROLE;
}
