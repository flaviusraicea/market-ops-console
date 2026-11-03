"use client";

import { useRouter } from "next/navigation";
import { parseAsString, useQueryState } from "nuqs";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { reportError } from "./events";
import { PERSONAS, defaultModeFor, type Persona, type Role } from "./roles";

export type RoleValue = {
  role: Role;
  user: Persona;
  switchRole: (role: Role) => void;
  /** From the sign-in screen: picks a persona and goes to the console. */
  signIn: (role: Role) => void;
  signOut: () => void;
};

export const RoleContext = createContext<RoleValue | null>(null);

async function send(method: "POST" | "DELETE", role?: Role): Promise<boolean> {
  try {
    const res = await fetch("/api/session", {
      method,
      ...(role
        ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ role }) }
        : {}),
    });
    if (!res.ok) {
      reportError(new Error(`Session ${method} failed with ${res.status}`), {
        source: "fetch",
        route: "/api/session",
      });
    }
    return res.ok;
  } catch (error) {
    reportError(error, { source: "fetch", route: "/api/session" });
    return false;
  }
}

/** The role the server rendered with. Changing it writes the cookie, then asks the server for a fresh render. */
export function RoleProvider({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const [, setMode] = useQueryState(
    "mode",
    parseAsString.withOptions({ history: "replace", shallow: false, clearOnDefault: false }),
  );

  const switchRole = useCallback(
    (next: Role) => {
      void send("POST", next).then((ok) => {
        if (!ok) return;
        // The address always names the view, so it has to move to the new role's view with the cookie.
        void setMode(defaultModeFor(next)).then(() => router.refresh());
      });
    },
    [router, setMode],
  );

  const signIn = useCallback(
    (next: Role) => {
      void send("POST", next).then((ok) => {
        if (!ok) return;
        // The root layout survives a client navigation, so it must render again to pick up the new cookie.
        startTransition(() => {
          router.push("/");
          router.refresh();
        });
      });
    },
    [router],
  );

  const signOut = useCallback(() => {
    void send("DELETE").then((ok) => {
      if (ok) router.push("/sign-in");
    });
  }, [router]);

  const value = useMemo<RoleValue>(
    () => ({ role, user: PERSONAS[role], switchRole, signIn, signOut }),
    [role, switchRole, signIn, signOut],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleValue {
  const value = useContext(RoleContext);
  if (!value) throw new Error("useRole must be used inside RoleProvider");
  return value;
}
