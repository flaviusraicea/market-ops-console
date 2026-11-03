"use client";

import type { Context as Cx, Dataset as Ds } from "@/domain";
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
 * are stable for the hook. This file is the registry for the Overview wrappers, one line of logic each; the
 * Analyst ones live in analyst/AnalystIslands.tsx so Overview does not download their widgets.
 */

const tiles = (e: Engine, ds: Ds, cx: Cx) => e.overview(ds, cx).tiles;
export function LiveKpiRow({ tiles: initial }: { tiles: OverviewVM["tiles"] }) {
  return <KpiRow tiles={useLiveVM(initial, tiles)} />;
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
