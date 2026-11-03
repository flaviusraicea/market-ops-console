"use client";

import { useEffect, useState } from "react";

import type { Dataset } from "@/domain";
import { DEFAULT_SOURCES_META, SOURCES_META, inlineKey } from "./inlineMap";
import { sourcesRows, type SourceRow } from "./sourcesRows";
import type { Resolved } from "./useAnswerMachine";

let full: Promise<Dataset> | undefined;

/**
 * The panel's dataset has no monthly series (keeps ~295 KB off the first load). The sources table needs it for
 * non-latest rows, so it is fetched as its own chunk the first time an answer with sources renders, then cached.
 */
export function loadFullDataset(): Promise<Dataset> {
  // The schema library rides in the same lazy chunk as the data it validates.
  full ??= Promise.all([import("@/data/data.json"), import("@/domain/dataset")]).then(
    ([data, schema]) => schema.parseDataset(data.default),
  );
  return full;
}

export type SourcesState =
  { status: "loading" } | { status: "ready"; rows: SourceRow[]; caption: string };

export function useSourcesRows(citations: readonly Resolved[]): SourcesState {
  const [fullDs, setFullDs] = useState<Dataset | undefined>();
  useEffect(() => {
    let live = true;
    void loadFullDataset().then((ds) => {
      if (live) setFullDs(ds);
    });
    return () => {
      live = false;
    };
  }, []);
  if (!fullDs) return { status: "loading" };
  const key = inlineKey(citations.map((c) => c.citation));
  return {
    status: "ready",
    ...sourcesRows(fullDs, citations, SOURCES_META[key] ?? DEFAULT_SOURCES_META),
  };
}
