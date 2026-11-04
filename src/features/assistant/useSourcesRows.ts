"use client";

import { useEffect, useState } from "react";

import type { Dataset } from "@/domain";
import { useDataset } from "@/lib/context/dataset";
import { lazyOnce } from "@/lib/lazyOnce";
import { DEFAULT_SOURCES_META, SOURCES_META, inlineKey } from "./inlineMap";
import { crossChecks } from "./crossChecks";
import { sourcesRows, type SourceRow } from "./sourcesRows";
import type { Resolved } from "./useAnswerMachine";

/**
 * The panel's dataset has no monthly series (keeps ~295 KB off the first load). The sources table needs it for
 * non-latest rows, so it is fetched as its own chunk the first time an answer with sources renders, then kept.
 * The schema library rides in the same lazy chunk as the data it validates; both load in parallel.
 */
const full = lazyOnce(() =>
  Promise.all([import("@/data/data.json"), import("@/domain/dataset")]).then(([data, schema]) =>
    schema.parseDataset(data.default),
  ),
);

export type SourcesState =
  { status: "loading" } | { status: "ready"; rows: SourceRow[]; caption: string; checks: string[] };

export function useSourcesRows(citations: readonly Resolved[], question = ""): SourcesState {
  const light = useDataset();
  const [fullDs, setFullDs] = useState<Dataset | undefined>();
  useEffect(() => {
    let live = true;
    // Without the series the table still shows the latest month's rows, which beats loading forever.
    full.load().then(
      (ds) => live && setFullDs(ds),
      () => live && setFullDs(light),
    );
    return () => {
      live = false;
    };
  }, [light]);
  if (!fullDs) return { status: "loading" };
  const key = inlineKey(citations.map((c) => c.citation));
  return {
    status: "ready",
    ...sourcesRows(fullDs, citations, SOURCES_META[key] ?? DEFAULT_SOURCES_META),
    checks: crossChecks(fullDs, key, question),
  };
}
