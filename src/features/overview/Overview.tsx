import type { Context } from "@/domain";
import { getDataset } from "@/lib/dataset";
import { AlertsCard } from "@/features/alerts/AlertsCard";
import { DatasetProvider } from "@/lib/context/dataset";
import { lightDataset } from "@/lib/context/invariants";
import { ErrorBoundary } from "@/features/shell/ErrorBoundary";
import { KpiRow } from "./KpiRow";
import { MapCard } from "./MapCard";
import { TopMovers } from "./TopMovers";
import { overviewVM } from "./viewModel";

/** Computes the view model on the server and hands plain props to the client islands. */
export function Overview({ ctx }: { ctx: Context }) {
  const vm = overviewVM(getDataset(), ctx);
  return (
    <div className="flex flex-col gap-[var(--gap)]">
      <ErrorBoundary widget="kpi-row">
        <KpiRow tiles={vm.tiles} />
      </ErrorBoundary>
      <ErrorBoundary widget="map">
        <MapCard map={vm.map} />
      </ErrorBoundary>
      <ErrorBoundary widget="top-movers">
        <TopMovers movers={vm.movers} />
      </ErrorBoundary>
      {ctx.mode === "analyst" ? (
        <ErrorBoundary widget="alerts">
          <DatasetProvider dataset={lightDataset(getDataset())}>
            <AlertsCard />
          </DatasetProvider>
        </ErrorBoundary>
      ) : null}
    </div>
  );
}
