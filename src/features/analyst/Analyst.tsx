import type { Context } from "@/domain";
import { ErrorBoundary } from "@/features/shell/ErrorBoundary";
import { getDataset } from "@/lib/dataset";
import { BasisSelector } from "./BasisSelector";
import { HeatMapCard } from "./HeatMapCard";
import { MarketGrid } from "./MarketGrid";
import { RadarCard } from "./RadarCard";
import { TimeSeriesCard } from "./TimeSeriesCard";
import { analystVM } from "./viewModel";

/** Analyst mode below the map: basis, grid, then the time series, radar and heat map. Server-computed. */
export function Analyst({ ctx }: { ctx: Context }) {
  const vm = analystVM(getDataset(), ctx);
  return (
    <>
      <BasisSelector basis={vm.basis} matDisabled={vm.matDisabled} />
      <ErrorBoundary widget="market-grid">
        <MarketGrid grid={vm.grid} />
      </ErrorBoundary>
      <ErrorBoundary widget="time-series">
        <TimeSeriesCard vm={vm.timeSeries} />
      </ErrorBoundary>
      <div className="grid gap-[var(--gap)] min-[1024px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ErrorBoundary widget="radar">
          <RadarCard vm={vm.radar} rowLabel={ctx.region ? "Market" : "Region"} />
        </ErrorBoundary>
        <ErrorBoundary widget="heat-map">
          <HeatMapCard vm={vm.heatMap} />
        </ErrorBoundary>
      </div>
    </>
  );
}
