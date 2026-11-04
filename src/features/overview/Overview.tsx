import type { ReactNode } from "react";

import type { Context } from "@/domain";
import { getDataset } from "@/lib/dataset";
import { OfflineNotice } from "@/features/shell/OfflineNotice";
import { PageToolbar } from "@/features/shell/PageToolbar";
import { contextKey } from "@/features/shell/contextKey";
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
export function Overview({ ctx, notice }: { ctx: Context; notice?: ReactNode }) {
  const ds = getDataset();
  const vm = overviewVM(ds, ctx);

  const strip = stripVM(ds, ctx);
  // A widget that failed for one context tries again when the context changes.
  const reset = contextKey(ctx);
  return (
    <>
      {/* Below 768 px the header's second row carries the selects, so the toolbar steps aside. */}
      <PageToolbar
        label="Executive controls"
        periods={ds.meta.periods}
        products={ds.products.map((p) => ({ id: p.id, name: p.name }))}
        className="max-md:hidden"
      />
      {notice}
      <OfflineNotice />
      <div className="flex flex-col gap-[var(--gap-section)]">
        <LiveVerdict verdict={verdictVM(ds, ctx)} />
        {strip.length > 0 ? (
          <ErrorBoundary widget="status-strip" resetKey={reset}>
            <LiveStatusStrip groups={strip} />
          </ErrorBoundary>
        ) : null}
        <ErrorBoundary widget="kpi-row" resetKey={reset}>
          <LiveKpiRow tiles={vm.tiles} />
        </ErrorBoundary>
        <ErrorBoundary widget="attention" resetKey={reset}>
          <LiveAttentionList attention={attentionVM(ds, ctx)} />
        </ErrorBoundary>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-[var(--gap)] lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-7">
            <ErrorBoundary widget="map" resetKey={reset}>
              <LiveMapCard map={vm.map} />
            </ErrorBoundary>
          </div>
          <div className="min-w-0 lg:col-span-5">
            <ErrorBoundary widget="region-bars" resetKey={reset}>
              <LiveRegionBars bars={regionBarsVM(ds, ctx)} />
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </>
  );
}
