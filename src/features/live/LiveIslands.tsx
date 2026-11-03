"use client";

import type { Context as Cx, Dataset as Ds } from "@/domain";
import { HeatMapCard } from "@/features/analyst/HeatMapCard";
import { KpiStrip } from "@/features/analyst/KpiStrip";
import { MapSection } from "@/features/analyst/MapSection";
import { MarketGrid } from "@/features/analyst/MarketGrid";
import { RadarCard } from "@/features/analyst/RadarCard";
import { TimeSeriesCard } from "@/features/analyst/TimeSeriesCard";
import type { AnalystVM } from "@/features/analyst/viewModel";
import { AttentionList } from "@/features/overview/AttentionList";
import { KpiRow } from "@/features/overview/KpiRow";
import { MapCard } from "@/features/overview/MapCard";
import { RegionBars } from "@/features/overview/RegionBars";
import { StatusStrip } from "@/features/overview/StatusStrip";
import { Verdict } from "@/features/overview/Verdict";
import type {
  AttentionVM,
  OverviewVM,
  RegionBarsVM,
  StripGroupVM,
  VerdictVM,
} from "@/features/overview/viewModel";
import type { LiveEngine as Engine } from "./engine";
import { useLiveVM } from "./LiveProvider";

/**
 * One wrapper per widget that moves in live mode. Each takes the same props as the widget, hands the server's
 * view model to `useLiveVM`, and renders the widget with whichever model comes back. Until Live is turned on
 * the server's model is returned untouched and nothing else loads. The selectors are module-level so they
 * are stable for the hook.
 */

const tiles = (e: Engine, ds: Ds, cx: Cx) => e.overview(ds, cx).tiles;
export function LiveKpiRow({ tiles: initial }: { tiles: OverviewVM["tiles"] }) {
  return <KpiRow tiles={useLiveVM(initial, tiles)} />;
}
export function LiveKpiStrip({ tiles: initial }: { tiles: OverviewVM["tiles"] }) {
  return <KpiStrip tiles={useLiveVM(initial, tiles)} />;
}

const verdict = (e: Engine, ds: Ds, cx: Cx) => e.verdict(ds, cx);
export function LiveVerdict({ verdict: initial }: { verdict: VerdictVM }) {
  return <Verdict verdict={useLiveVM(initial, verdict)} />;
}

const strip = (e: Engine, ds: Ds, cx: Cx) => e.strip(ds, cx);
export function LiveStatusStrip({ groups }: { groups: StripGroupVM[] }) {
  return <StatusStrip groups={useLiveVM(groups, strip)} />;
}

const attention = (e: Engine, ds: Ds, cx: Cx) => e.attention(ds, cx);
export function LiveAttentionList({ attention: initial }: { attention: AttentionVM }) {
  return <AttentionList attention={useLiveVM(initial, attention)} />;
}

const map = (e: Engine, ds: Ds, cx: Cx) => e.overview(ds, cx).map;
export function LiveMapCard({ map: initial }: { map: OverviewVM["map"] }) {
  return <MapCard map={useLiveVM(initial, map)} scheme="status" />;
}

const regionBars = (e: Engine, ds: Ds, cx: Cx) => e.regionBars(ds, cx);
export function LiveRegionBars({ bars }: { bars: RegionBarsVM }) {
  return <RegionBars bars={useLiveVM(bars, regionBars)} />;
}
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
