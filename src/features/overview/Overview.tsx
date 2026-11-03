import type { Context } from "@/domain";
import { getDataset } from "@/lib/dataset";
import { ErrorBoundary } from "@/features/shell/ErrorBoundary";
import {
  LiveAttentionList,
  LiveKpiRow,
  LiveMapCard,
  LiveRegionBars,
  LiveStatusStrip,
  LiveVerdict,
} from "@/features/live/LiveIslands";
import { attentionVM, overviewVM, regionBarsVM, stripVM, verdictVM } from "./viewModel";

/** Computes the view models on the server and hands plain props to the client islands. */
export function Overview({ ctx }: { ctx: Context }) {
  const ds = getDataset();
  const vm = overviewVM(ds, ctx);

  const strip = stripVM(ds, ctx);
  return (
    <div className="flex flex-col gap-[var(--gap-section)]">
      <LiveVerdict verdict={verdictVM(ds, ctx)} />
      {strip.length > 0 ? (
        <ErrorBoundary widget="status-strip">
          <LiveStatusStrip groups={strip} />
        </ErrorBoundary>
      ) : null}
      <ErrorBoundary widget="kpi-row">
        <LiveKpiRow tiles={vm.tiles} />
      </ErrorBoundary>
      <ErrorBoundary widget="attention">
        <LiveAttentionList attention={attentionVM(ds, ctx)} />
      </ErrorBoundary>
      <div className="grid gap-[var(--gap)] lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ErrorBoundary widget="map">
            <LiveMapCard map={vm.map} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-5">
          <ErrorBoundary widget="region-bars">
            <LiveRegionBars bars={regionBarsVM(ds, ctx)} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
