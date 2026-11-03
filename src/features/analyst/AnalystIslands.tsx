"use client";

import dynamic from "next/dynamic";

import type { Context as Cx, Dataset as Ds } from "@/domain";
import type { LiveEngine as Engine } from "@/features/live/engine";
import { useLiveVM } from "@/features/live/LiveProvider";
import type { OverviewVM, RegionBarsVM } from "@/features/overview/viewModel";
import { SectionSkeleton, ToolbarSkeleton } from "./AnalystSkeletons";
import type { AnalystVM } from "./viewModel";

/**
 * Every Analyst widget, loaded through next/dynamic so Overview never downloads them. They still render on the
 * server (the default), so a direct Analyst link paints complete HTML; the `loading` blocks only show on a
 * client-side switch from Overview, and they hold each section's height. The Live wrappers hand the server's
 * model to `useLiveVM` exactly as the Overview ones in live/LiveIslands.tsx do.
 */

const AnalystToolbar = dynamic(() => import("./AnalystToolbar").then((m) => m.AnalystToolbar), {
  loading: () => <ToolbarSkeleton />,
});
export { AnalystToolbar };

const KpiStrip = dynamic(() => import("./KpiStrip").then((m) => m.KpiStrip), {
  loading: () => <SectionSkeleton label="key figures" reserve="kpi" />,
});
const MarketGrid = dynamic(() => import("./MarketGrid").then((m) => m.MarketGrid), {
  loading: () => <SectionSkeleton label="market grid" reserve="grid" />,
});
const MapSection = dynamic(() => import("./MapSection").then((m) => m.MapSection), {
  loading: () => <SectionSkeleton label="map" reserve="map" />,
});
const TimeSeriesCard = dynamic(() => import("./TimeSeriesCard").then((m) => m.TimeSeriesCard), {
  loading: () => <SectionSkeleton label="time series" reserve="series" />,
});
const RadarCard = dynamic(() => import("./RadarCard").then((m) => m.RadarCard), {
  loading: () => <SectionSkeleton label="compare chart" reserve="radar" />,
});
const HeatMapCard = dynamic(() => import("./HeatMapCard").then((m) => m.HeatMapCard), {
  loading: () => <SectionSkeleton label="heat map" reserve="heat" />,
});
export const AlertsSection = dynamic(() => import("./AlertsSection").then((m) => m.AlertsSection), {
  loading: () => <SectionSkeleton label="alerts" reserve="alerts" />,
});

const tiles = (e: Engine, ds: Ds, cx: Cx) => e.overview(ds, cx).tiles;
export function LiveKpiStrip({ tiles: initial }: { tiles: OverviewVM["tiles"] }) {
  return <KpiStrip tiles={useLiveVM(initial, tiles)} />;
}

const map = (e: Engine, ds: Ds, cx: Cx) => e.overview(ds, cx).map;
const regionBars = (e: Engine, ds: Ds, cx: Cx) => e.regionBars(ds, cx);
export function LiveMapSection({
  map: initialMap,
  regions,
}: {
  map: OverviewVM["map"];
  regions: RegionBarsVM;
}) {
  return <MapSection map={useLiveVM(initialMap, map)} regions={useLiveVM(regions, regionBars)} />;
}

const grid = (e: Engine, ds: Ds, cx: Cx) => e.analyst(ds, cx).grid;
export function LiveMarketGrid({ grid: initial }: { grid: AnalystVM["grid"] }) {
  return <MarketGrid grid={useLiveVM(initial, grid)} />;
}

const timeSeries = (e: Engine, ds: Ds, cx: Cx) => e.analyst(ds, cx).timeSeries;
export function LiveTimeSeriesCard({ vm }: { vm: AnalystVM["timeSeries"] }) {
  return <TimeSeriesCard vm={useLiveVM(vm, timeSeries)} />;
}

const radar = (e: Engine, ds: Ds, cx: Cx) => e.analyst(ds, cx).radar;
export function LiveRadarCard({ vm, rowLabel }: { vm: AnalystVM["radar"]; rowLabel: string }) {
  return <RadarCard vm={useLiveVM(vm, radar)} rowLabel={rowLabel} />;
}

const heatMap = (e: Engine, ds: Ds, cx: Cx) => e.analyst(ds, cx).heatMap;
export function LiveHeatMapCard({ vm }: { vm: AnalystVM["heatMap"] }) {
  return <HeatMapCard vm={useLiveVM(vm, heatMap)} />;
}
