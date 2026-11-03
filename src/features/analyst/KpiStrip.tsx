import { KpiTile } from "@/components/KpiTile";
import type { KpiTileVM } from "@/features/overview/viewModel";

/** The four KPIs as one ruled row of the sheet: vertical rules between cells, 2 × 2 under 768 px. */
export function KpiStrip({ tiles, provenance }: { tiles: KpiTileVM[]; provenance: string }) {
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
        {provenance}
      </p>
    </div>
  );
}
