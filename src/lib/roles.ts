import type { Mode } from "@/domain";
import { oneOf } from "@/lib/oneOf";

/**
 * The mock identity layer. Nothing here is real authentication: the role is a cookie the proxy sets and a
 * route handler changes, so the first server render and the API both know who is "signed in".
 */
export const ROLES = ["executive", "analyst"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_COOKIE = "market-ops-role";
export const ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const DEFAULT_ROLE: Role = "executive";

export type Persona = {
  role: Role;
  name: string;
  initials: string;
  email: string;
  /** What this persona is for, shown on the sign-in cards. */
  summary: string;
};

/** Fictional people. */
export const PERSONAS: Readonly<Record<Role, Persona>> = {
  executive: {
    role: "executive",
    name: "Dana Whitfield",
    initials: "DW",
    email: "dana.whitfield@example.com",
    summary: "Executive overview, read-only alerts",
  },
  analyst: {
    role: "analyst",
    name: "Sam Okafor",
    initials: "SO",
    email: "sam.okafor@example.com",
    summary: "Analyst deep-dive, manages alerts",
  },
};

export const ROLE_LABEL: Readonly<Record<Role, string>> = {
  executive: "Executive",
  analyst: "Analyst",
};

/** What a role changes, in the words the sign-in cards, the account button and its menu all share. */
export const ROLE_EFFECT: Readonly<Record<Role, string>> = {
  executive: "alerts read-only",
  analyst: "can edit alerts",
};

export function parseRole(value: string | null | undefined): Role | null {
  return oneOf(ROLES, value);
}

/** The view a role opens on when the URL names none. Modes and roles share their names. */
export const defaultModeFor = (role: Role): Mode => role;

/** Only an Analyst manages alert rules. */
export const canEditAlerts = (role: Role): boolean => role === "analyst";

/** The attributes of the role cookie, shared by the proxy (first visit) and the session route (switching). */
export const roleCookie = (role: Role) =>
  ({
    name: ROLE_COOKIE,
    value: role,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ROLE_COOKIE_MAX_AGE,
  }) as const;
