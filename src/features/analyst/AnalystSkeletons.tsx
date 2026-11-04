import type { CSSProperties } from "react";

import { Skeleton } from "@/components/ui/skeleton";

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
