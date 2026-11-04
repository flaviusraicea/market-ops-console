import type { CSSProperties } from "react";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * The rendered height of each lazy Analyst section, in px, measured on the current design in the Analyst density
 * (every desktop width from 1280 up; the map is the exception and gets its own skeleton, MapSkeleton). A section
 * whose height depends on the data gets its real value from the server through a `--reserve-<name>` custom
 * property on the sheet (reserveStyle); the number here is the fallback. Keep these in step with the sections:
 * `loading-and-caching.spec.ts` compares each placeholder with the section it stands for.
 */
export const RESERVE = {
  /** Four tiles in one row plus the provenance line. */
  kpi: 144,
  /** The grid's chrome around the table: section padding, the title row, the table's head and total rows. */
  grid: 136,
  series: 346,
  /** The compare chart: title, legend row and a 340 px chart. The heat map beside it stretches to the same height. */
  radar: 464,
  heat: 464,
  alerts: 42,
};
export type Reserve = keyof typeof RESERVE;

/** A grid row: a product row is one line; a market row carries a status badge. */
const GRID_ROW = { product: 32, market: 37 };
/** The heat map: its chrome and the legend row, plus one row of cells per market or product. */
const HEAT_BASE = 194;
const HEAT_ROW = 26;

/**
 * The server knows the context before any section is built, so it sets the heights that depend on it: the grid
 * is its chrome plus one row per market (or per product when a market is in view, which drops the status badge),
 * and the radar and heat map pair is as tall as the taller of the two, which is the heat map once it has more
 * than ten rows.
 */
export function reserveStyle({
  gridRows,
  heatRows,
  marketInView,
}: {
  gridRows: number;
  heatRows: number;
  marketInView: boolean;
}): CSSProperties {
  const grid = RESERVE.grid + (marketInView ? GRID_ROW.product : GRID_ROW.market) * gridRows;
  const pair = Math.max(RESERVE.radar, HEAT_BASE + HEAT_ROW * heatRows);
  return {
    "--reserve-grid": `${grid}px`,
    "--reserve-radar": `${pair}px`,
    "--reserve-heat": `${pair}px`,
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
      {/* The alerts section at rest is one title row, so its placeholder is the title line alone. */}
      {RESERVE[reserve] > 60 ? <Skeleton aria-hidden className="w-full flex-1" /> : null}
    </div>
  );
}

/**
 * The map section's height follows the width: its figure keeps a 1 / 0.52 aspect in the wider of two columns, up
 * to 420 px. So this placeholder is built like the section (the same padding, title row, column split and figure
 * rule, and the legend and caption space under the figure) instead of holding one number.
 */
export function MapSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2 p-[var(--pad-card)]">
      <span className="sr-only">Loading map</span>
      <div className="flex h-7 items-center">
        <Skeleton aria-hidden className="h-3 w-40" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-4 min-[1024px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="max-md:hidden">
          <Skeleton
            aria-hidden
            className="min-h-[220px] w-full lg:min-h-[320px]"
            style={{ aspectRatio: "1 / 0.52", maxHeight: 420 }}
          />
          <div aria-hidden className="h-[84px]" />
        </div>
      </div>
    </div>
  );
}
