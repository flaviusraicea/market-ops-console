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
      <div className="grid gap-[var(--gap)] min-[1024px]:grid-cols-2">
        <ErrorBoundary widget="time-series">
          <TimeSeriesCard vm={vm.timeSeries} />
        </ErrorBoundary>
        <ErrorBoundary widget="radar">
          <RadarCard vm={vm.radar} rowLabel={ctx.region ? "Market" : "Region"} />
        </ErrorBoundary>
        <ErrorBoundary widget="heat-map">
          <HeatMapCard vm={vm.heatMap} className="min-[1024px]:col-span-2" />
        </ErrorBoundary>
      </div>
    </>
  );
}
