"use client";

import dynamic from "next/dynamic";

import type { FactsVM } from "./viewModel";

// The virtualiser and the 1,560-row table stay out of the first bundle; the chunk loads when All facts opens.
const FactsTable = dynamic(() => import("./FactsTable").then((m) => m.FactsTable), {
  ssr: false,
  loading: () => (
    <div role="status" className="p-[var(--pad-card)] text-ink-muted">
      Loading facts…
    </div>
  ),
});

export function LazyFactsTable({ facts }: { facts: FactsVM }) {
  return <FactsTable facts={facts} />;
}
