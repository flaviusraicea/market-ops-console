"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { ConsoleMeta } from "./invariants";

const MetaContext = createContext<ConsoleMeta | null>(null);

export function ConsoleMetaProvider({
  meta,
  children,
}: {
  meta: ConsoleMeta;
  children: ReactNode;
}) {
  return <MetaContext.Provider value={meta}>{children}</MetaContext.Provider>;
}

export function useConsoleMeta(): ConsoleMeta {
  const meta = useContext(MetaContext);
  if (!meta) throw new Error("useConsoleMeta must be used inside ConsoleMetaProvider");
  return meta;
}
