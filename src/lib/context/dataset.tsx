"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Dataset } from "@/domain";

const DatasetContext = createContext<Dataset | null>(null);

export function DatasetProvider({ dataset, children }: { dataset: Dataset; children: ReactNode }) {
  return <DatasetContext.Provider value={dataset}>{children}</DatasetContext.Provider>;
}

export function useDataset(): Dataset {
  const ds = useContext(DatasetContext);
  if (!ds) throw new Error("useDataset must be used inside DatasetProvider");
  return ds;
}
