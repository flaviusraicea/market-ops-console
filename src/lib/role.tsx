"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { PERSONAS, type Persona, type Role } from "./roles";

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
    return res.ok;
  } catch {
    return false;
  }
}

/** The role the server rendered with. Changing it writes the cookie, then asks the server for a fresh render. */
export function RoleProvider({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();

  const switchRole = useCallback(
    (next: Role) => {
      void send("POST", next).then((ok) => {
        if (ok) router.refresh();
      });
    },
    [router],
  );

  const signIn = useCallback(
    (next: Role) => {
      void send("POST", next).then((ok) => {
        if (ok) router.push("/");
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
