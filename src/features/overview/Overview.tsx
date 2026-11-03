import type { Context } from "@/domain";
import { getDataset } from "@/lib/dataset";
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
            <MapCard map={vm.map} scheme="status" />
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
