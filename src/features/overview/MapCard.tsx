"use client";

import { useEffect, useId, useState } from "react";

import { CardHeader } from "@/components/CardHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Notice } from "@/components/Notice";
import type { MapGeo } from "@/components/charts/Choropleth";
import { LazyChoropleth, MapSkeleton } from "@/components/charts/LazyChoropleth";
import { Legend, type LegendItem } from "@/components/charts/Legend";
import {
  ATTAINMENT_LEGEND,
  GROWTH_LEGEND,
  revenueLegend,
  type LegendBin,
} from "@/components/charts/scales";
import {
  TableView,
  ViewAsTableToggle,
  useTableFirstOnPhone,
} from "@/components/charts/ViewAsTable";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Metric } from "@/domain";
import { reportError } from "@/lib/events";
import { PHONE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { GEO_URL } from "@/lib/geoAsset";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import type { OverviewVM } from "./viewModel";

export const METRIC_LABEL: Record<Metric, string> = {
  attainment: "Attainment",
  revenue: "Revenue",
  growth: "Growth",
};

const MAP_HEIGHT = 320;

export type GeoState =
  { status: "loading" } | { status: "error" } | { status: "ready"; geo: MapGeo };

let geoCache: Promise<MapGeo> | null = null;
let geoLoaded: MapGeo | null = null;

function loadGeo(): Promise<MapGeo> {
  geoCache ??= fetch(GEO_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Geometry request failed: ${res.status}`);
      return res.json() as Promise<MapGeo>;
    })
    .then((geo) => {
      geoLoaded = geo;
      return geo;
    })
    .catch((err: unknown) => {
      geoCache = null; // allow a later mount to retry
      reportError(err, { source: "fetch", route: GEO_URL });
      throw err;
    });
  return geoCache;
}

/**
 * The map geometry, fetched once. With `holdOnPhone` (nobody has chosen a view yet) a phone skips the fetch,
 * because it shows the table first; the geometry loads when the person asks for the map.
 */
export function useGeo(holdOnPhone = false): GeoState {
  // Read so the effect runs again when the width crosses 768 px: a phone that is widened must load the map.
  const phone = useMediaQuery(PHONE_QUERY);
  const [state, setState] = useState<GeoState>(
    geoLoaded ? { status: "ready", geo: geoLoaded } : { status: "loading" },
  );
  useEffect(() => {
    if (geoLoaded) return;
    if (holdOnPhone && window.matchMedia(PHONE_QUERY).matches) return;
    let live = true;
    loadGeo().then(
      (geo) => live && setState({ status: "ready", geo }),
      () => live && setState({ status: "error" }),
    );
    return () => {
      live = false;
    };
  }, [holdOnPhone, phone]);
  return state;
}

export function legendFor(map: OverviewVM["map"]): LegendBin[] {
  if (map.metric === "attainment") return ATTAINMENT_LEGEND;
  if (map.metric === "growth") return GROWTH_LEGEND;
  return revenueLegend(map.maxRevenue);
}

export function MarketsTable({ map }: { map: OverviewVM["map"] }) {
  return (
    <Table stickyFirst scrollLabel="Markets table">
      <TableCaption className="sr-only">
        Markets, {map.periodLabel}. {map.provenance}
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Market</TableHead>
          <TableHead scope="col" className="max-md:px-2">
            Region
          </TableHead>
          <TableHead scope="col" className="max-md:px-2">
            Status
          </TableHead>
          <TableHead scope="col" className="text-right">
            Attainment
          </TableHead>
          <TableHead scope="col" className="text-right">
            Revenue (USD)
          </TableHead>
          <TableHead scope="col" className="text-right">
            Growth
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {map.rows.map((r) => (
          <TableRow key={r.id} {...(map.selected === r.id ? { "data-state": "selected" } : {})}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="text-ink-2 max-md:px-2 max-md:whitespace-normal">
              {r.region}
            </TableCell>
            <TableCell className="max-md:px-2">
              <StatusBadge status={r.status} label={r.statusLabel} size="sm" />
            </TableCell>
            <TableCell className="text-right">{r.attainment}</TableCell>
            <TableCell className="text-right">{r.revenue}</TableCell>
            <TableCell className="text-right">{r.growth}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const STATUS_LEGEND: LegendItem[] = [
  { label: "On track", swatch: "status", status: "on_track" },
  { label: "At risk", swatch: "status", status: "at_risk" },
  { label: "Off track", swatch: "status", status: "off_track" },
];

/** The executive map answers "where is the trouble", so it is coloured by status; Analyst keeps the metric. */
export function MapCard({
  map,
  scheme = "metric",
}: {
  map: OverviewVM["map"];
  scheme?: "metric" | "status";
}) {
  const { setContext } = useConsoleContext();
  const { pressed, auto, viewMap, toggle } = useTableFirstOnPhone();
  const geoState = useGeo(auto);
  const tableId = useId();
  const metricLabel = METRIC_LABEL[map.metric];

  const byStatus = scheme === "status";
  const legend: LegendItem[] = byStatus
    ? STATUS_LEGEND
    : legendFor(map).map((b) => ({ label: b.label, swatch: "fill", color: b.token }));

  const metricControl = byStatus ? null : (
    <SegmentedControl<Metric>
      ariaLabel="Map metric"
      value={map.metric}
      onChange={(metric) => setContext({ metric })}
      options={(Object.keys(METRIC_LABEL) as Metric[]).map((m) => ({
        value: m,
        label: METRIC_LABEL[m],
      }))}
    />
  );

  const chart =
    geoState.status === "ready" ? (
      <LazyChoropleth
        geo={geoState.geo}
        values={map.values}
        metric={map.metric}
        metricLabel={metricLabel}
        scheme={scheme}
        periodLabel={map.periodLabel}
        selected={map.selected}
        focus={map.focus}
        height={MAP_HEIGHT}
        onSelect={(market) => setContext({ market })}
      />
    ) : (
      <MapSkeleton height={MAP_HEIGHT} />
    );

  const legendEl = (
    <div className="mx-auto mt-2 flex w-full max-w-[40rem] justify-center">
      <Legend items={legend} label={`${byStatus ? "Status" : metricLabel} colour scale`} />
    </div>
  );

  const forced = geoState.status === "error";
  const showTable = forced || pressed;

  return (
    <section
      aria-labelledby="map-h"
      className="flex h-full flex-col gap-3 rounded-sheet layer-card p-[var(--pad-card)]"
    >
      <CardHeader
        title={byStatus ? "Markets by status" : `Markets by ${metricLabel.toLowerCase()}`}
        titleId="map-h"
        subtitle={map.subtitle}
        actions={
          <>
            {metricControl}
            {forced ? null : (
              <ViewAsTableToggle
                pressed={pressed}
                controls={tableId}
                onPressedChange={toggle}
                subject="the markets map"
                {...viewMap}
              />
            )}
          </>
        }
      />
      {forced ? (
        <Notice title="Map unavailable">The market table below has the same data.</Notice>
      ) : null}
      <TableView
        id={tableId}
        pressed={showTable}
        auto={auto && !forced}
        chart={
          forced ? null : (
            <>
              {chart}
              {legendEl}
            </>
          )
        }
        table={<MarketsTable map={map} />}
      />
    </section>
  );
}
