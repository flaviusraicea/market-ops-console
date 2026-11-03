import type { Context } from "@/domain";
import { ConnectedAlertsSection } from "./AlertsSection";
import { overviewVM, regionBarsVM } from "@/features/overview/viewModel";
import { ErrorBoundary } from "@/features/shell/ErrorBoundary";
import { DatasetProvider } from "@/lib/context/dataset";
import { lightDataset } from "@/lib/context/invariants";
import { getDataset } from "@/lib/dataset";
import { AnalystToolbar } from "./AnalystToolbar";
import {
  LiveHeatMapCard,
  LiveKpiStrip,
  LiveMapSection,
  LiveMarketGrid,
  LiveRadarCard,
  LiveTimeSeriesCard,
} from "@/features/live/LiveIslands";
import { LazyFactsTable } from "./LazyFactsTable";
import { Sheet } from "./Sheet";
import { analystVM, factsVM } from "./viewModel";

/**
 * Analyst mode: a sticky toolbar over one ruled sheet. KPI strip, the grid first, then the map, the time
 * series, compare and the heat map, and alerts folded away at the end. Server-computed.
 */
export function Analyst({ ctx }: { ctx: Context }) {
  const ds = getDataset();
  const vm = analystVM(ds, ctx);
  const overview = overviewVM(ds, ctx);
  return (
    <div className="flex flex-col">
      <h2 className="sr-only">Analyst view</h2>
      <AnalystToolbar
        periods={ds.meta.periods}
        products={ds.products.map((p) => ({ id: p.id, name: p.name }))}
        basis={vm.basis}
        matDisabled={vm.matDisabled}
        statusRule={vm.statusRule}
      />
      <Sheet>
        <ErrorBoundary widget="kpi-strip">
          <LiveKpiStrip tiles={overview.tiles} />
        </ErrorBoundary>
        <ErrorBoundary widget="market-grid">
          <LiveMarketGrid grid={vm.grid} />
        </ErrorBoundary>
        {ctx.facts ? (
          <ErrorBoundary widget="facts-table">
            <LazyFactsTable facts={factsVM(ds, ctx)} />
          </ErrorBoundary>
        ) : null}
        <ErrorBoundary widget="map">
          <LiveMapSection map={overview.map} regions={regionBarsVM(ds, ctx)} />
        </ErrorBoundary>
        <ErrorBoundary widget="time-series">
          <LiveTimeSeriesCard vm={vm.timeSeries} />
        </ErrorBoundary>
        <div className="grid min-[1024px]:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] min-[1024px]:divide-x min-[1024px]:divide-border max-[1023px]:divide-y max-[1023px]:divide-border">
          <ErrorBoundary widget="radar">
            <LiveRadarCard vm={vm.radar} rowLabel={ctx.region ? "Market" : "Region"} />
          </ErrorBoundary>
          <ErrorBoundary widget="heat-map">
            <LiveHeatMapCard vm={vm.heatMap} />
          </ErrorBoundary>
        </div>
        <ErrorBoundary widget="alerts">
          <DatasetProvider dataset={lightDataset(ds)}>
            <ConnectedAlertsSection />
          </DatasetProvider>
        </ErrorBoundary>
      </Sheet>
    </div>
  );
}
