import { KpiTile } from "@/components/KpiTile";
import type { KpiTileVM } from "@/features/overview/viewModel";

/**
 * One line for the whole strip. The tiles share a source or a derivation more often than not, so it is said once:
 * "Derived · sum of series · Source data.json" when the figures are sums and the status counts come from the file.
 */
export function stripProvenance(tiles: readonly KpiTileVM[]): string {
  const unique = [...new Set(tiles.map((t) => t.provenance))];
  return unique.length === 1
    ? unique[0]!
    : unique.map((p, i) => (i === 0 ? p : p.replace(/^Source · /, "Source "))).join(" · ");
}

/** The four KPIs as one ruled row of the sheet: vertical rules between cells, 2 × 2 under 768 px. */
export function KpiStrip({ tiles }: { tiles: KpiTileVM[] }) {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x md:divide-border">
        {tiles.map((tile, i) => (
          <KpiTile
            key={tile.label}
            variant="strip"
            {...tile}
            {...(i % 2 === 1 ? { className: "max-md:border-l max-md:border-border" } : {})}
          />
        ))}
      </div>
      <p
        data-slot="kpi-provenance-line"
        className="mt-1.5 px-[var(--pad-card)] pb-2 text-right text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted"
      >
        {stripProvenance(tiles)}
      </p>
    </div>
  );
}
