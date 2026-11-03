"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState, type ReactNode } from "react";

import { RoleProvider } from "@/lib/role";
import type { Role } from "@/lib/roles";

export function Providers({ role, children }: { role: Role; children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return (
    <NuqsAdapter>
      <QueryClientProvider client={client}>
        <RoleProvider role={role}>{children}</RoleProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
