"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import { RoleProvider } from "@/lib/role";
import type { Role } from "@/lib/roles";

export function Providers({ role, children }: { role: Role; children: ReactNode }) {
  return (
    <NuqsAdapter>
      <RoleProvider role={role}>{children}</RoleProvider>
    </NuqsAdapter>
  );
}
