"use client";

import dynamic from "next/dynamic";

import { FACTS_VIEWPORT_H } from "./factsViewport";
import { SheetSection } from "./Sheet";

// The virtualiser and the 1,560-row table stay out of the first bundle; the chunk loads when All facts opens.
// The placeholder has the section's final height, so a `facts=1` link does not shift the page when it swaps in.
export const LazyFactsTable = dynamic(() => import("./FactsTable").then((m) => m.FactsTable), {
  ssr: false,
  loading: () => (
    <SheetSection eyebrow="All facts" subtitle="Source rows behind every figure">
      <div
        role="status"
        style={{ height: FACTS_VIEWPORT_H }}
        className="rounded-control border border-border p-3 text-ink-muted"
      >
        Loading facts…
      </div>
    </SheetSection>
  ),
});
