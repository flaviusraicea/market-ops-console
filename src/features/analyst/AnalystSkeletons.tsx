import type { CSSProperties } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { FACTS_VIEWPORT_H } from "./factsViewport";
import { Sheet } from "./Sheet";

/**
 * The rendered height of each lazy Analyst section at 1440 wide, in px. A section whose height depends on the
 * data (the grid grows with its rows) gets its real value from the server through a `--reserve-<name>` custom
 * property on the sheet (see reserveStyle); the number here is the fallback.
 */
export const RESERVE = {
  kpi: 88,
  grid: 540,
  map: 471,
  series: 321,
  radar: 480,
  heat: 480,
  alerts: 40,
  /** The All facts table: its scroll viewport (factsViewport.ts) plus the section header. */
  facts: FACTS_VIEWPORT_H + 72,
};
export type Reserve = keyof typeof RESERVE;

/**
 * The server knows the context before any section is built, so it sets the heights that depend on it: the grid is
 * a header (about 114 px with the card padding and the total row) plus one 33 px row per market, and with a market
 * in view the KPI strip and the two charts under it are a little shorter or taller.
 */
export function reserveStyle(gridRows: number, marketInView: boolean): CSSProperties {
  return {
    "--reserve-grid": `${114 + gridRows * 33}px`,
    "--reserve-kpi": marketInView ? `${RESERVE.kpi}px` : "72px",
    "--reserve-radar": marketInView ? "472px" : "490px",
    "--reserve-heat": marketInView ? "472px" : "490px",
  } as CSSProperties; // CSSProperties has no index for custom properties
}

/**
 * Stands in for a lazy Analyst section while its chunk loads, and in the server-rendered HTML until the section
 * streams in. It holds the section's height so neither the swap nor the stream shifts the page. No fake numbers:
 * it is a quiet block with a screen-reader label.
 */
export function SectionSkeleton({ label, reserve }: { label: string; reserve: Reserve }) {
  return (
    <div
      role="status"
      aria-busy="true"
      style={{ minHeight: `var(--reserve-${reserve}, ${RESERVE[reserve]}px)` }}
      className="flex flex-col gap-3 p-[var(--pad-card)]"
    >
      <span className="sr-only">Loading {label}</span>
      <Skeleton aria-hidden className="h-3 w-40" />
      <Skeleton aria-hidden className="w-full flex-1" />
    </div>
  );
}

/** The sticky toolbar's height (h-10), so the sheet does not jump under it. */
export function ToolbarSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="sticky top-[var(--header-h)] z-20 mb-[var(--gap-section)] flex h-10 items-center border-b border-border bg-bg"
    >
      <span className="sr-only">Loading analyst controls</span>
      <Skeleton aria-hidden className="h-4 w-64" />
    </div>
  );
}

/**
 * Stands in for the whole Analyst view while the server streams it: same toolbar, same sheet, each section held
 * at its real height, so the swap to the real view moves nothing. Overview has its own (OverviewSkeleton).
 */
export function AnalystSkeleton({
  style,
  facts,
}: {
  style: CSSProperties;
  /** A `facts=1` link also opens the All facts table under the grid. */
  facts: boolean;
}) {
  return (
    <div className="flex flex-col" aria-busy="true" data-slot="analyst-skeleton">
      <span className="sr-only">Loading dashboard</span>
      <ToolbarSkeleton />
      <Sheet style={style}>
        <SectionSkeleton label="key figures" reserve="kpi" />
        <SectionSkeleton label="market grid" reserve="grid" />
        {facts ? <SectionSkeleton label="all facts" reserve="facts" /> : null}
        <SectionSkeleton label="map" reserve="map" />
        <SectionSkeleton label="time series" reserve="series" />
        <div className="grid min-[1024px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] max-[1023px]:divide-y max-[1023px]:divide-border min-[1024px]:divide-x min-[1024px]:divide-border">
          <SectionSkeleton label="compare chart" reserve="radar" />
          <SectionSkeleton label="heat map" reserve="heat" />
        </div>
        <SectionSkeleton label="alerts" reserve="alerts" />
      </Sheet>
    </div>
  );
}
