import type { Context } from "@/domain";
import { getDataset } from "@/lib/dataset";
import { AlertsCard } from "@/features/alerts/AlertsCard";
import { DatasetProvider } from "@/lib/context/dataset";
import { lightDataset } from "@/lib/context/invariants";
import { Analyst } from "@/features/analyst/Analyst";
import { ErrorBoundary } from "@/features/shell/ErrorBoundary";
import { AttentionList } from "./AttentionList";
import { KpiRow } from "./KpiRow";
import { MapCard } from "./MapCard";
import { RegionBars } from "./RegionBars";
import { StatusStrip } from "./StatusStrip";
import { Verdict } from "./Verdict";
import { attentionVM, overviewVM, regionBarsVM, stripVM, verdictVM } from "./viewModel";

/** Computes the view models on the server and hands plain props to the client islands. */
export function Overview({ ctx }: { ctx: Context }) {
  const ds = getDataset();
  const vm = overviewVM(ds, ctx);

  if (ctx.mode === "analyst") {
    return (
      <div className="flex flex-col gap-[var(--gap)]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-[length:var(--text-title)] leading-[var(--text-title-lh)] font-semibold tracking-[var(--text-title-ls)] text-ink">
            {vm.title}
          </h2>
          <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
            {vm.caption}
          </p>
        </div>
        <ErrorBoundary widget="kpi-row">
          <KpiRow tiles={vm.tiles} />
        </ErrorBoundary>
        <ErrorBoundary widget="map">
          <MapCard map={vm.map} />
        </ErrorBoundary>
        <Analyst ctx={ctx} />
        <ErrorBoundary widget="alerts">
          <DatasetProvider dataset={lightDataset(ds)}>
            <AlertsCard />
          </DatasetProvider>
        </ErrorBoundary>
      </div>
    );
  }

  const strip = stripVM(ds, ctx);
  return (
    <div className="flex flex-col gap-[var(--gap-section)]">
      <Verdict verdict={verdictVM(ds, ctx)} />
      {strip.length > 0 ? (
        <ErrorBoundary widget="status-strip">
          <StatusStrip groups={strip} />
        </ErrorBoundary>
      ) : null}
      <ErrorBoundary widget="kpi-row">
        <KpiRow tiles={vm.tiles} />
      </ErrorBoundary>
      <ErrorBoundary widget="attention">
        <AttentionList attention={attentionVM(ds, ctx)} />
      </ErrorBoundary>
      <div className="grid gap-[var(--gap)] lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ErrorBoundary widget="map">
            <MapCard map={vm.map} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-5">
          <ErrorBoundary widget="region-bars">
            <RegionBars bars={regionBarsVM(ds, ctx)} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
