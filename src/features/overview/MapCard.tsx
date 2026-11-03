"use client";

import { useEffect, useId, useState } from "react";

import { CardHeader } from "@/components/CardHeader";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Notice } from "@/components/Notice";
import { Choropleth, type MapGeo } from "@/components/charts/Choropleth";
import { Legend, type LegendItem } from "@/components/charts/Legend";
import {
  ATTAINMENT_LEGEND,
  GROWTH_LEGEND,
  revenueLegend,
  type LegendBin,
} from "@/components/charts/scales";
import { TableView, ViewAsTableToggle } from "@/components/charts/ViewAsTable";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import type { OverviewVM } from "./viewModel";

const METRIC_LABEL: Record<Metric, string> = {
  attainment: "Attainment",
  revenue: "Revenue",
  growth: "Growth",
};

const MAP_HEIGHT = 320;

const DOT: Record<string, string> = {
  on_track: "bg-ok-mark",
  at_risk: "bg-warn-mark",
  off_track: "bg-bad-mark",
};

type GeoState = { status: "loading" } | { status: "error" } | { status: "ready"; geo: MapGeo };

let geoCache: Promise<MapGeo> | null = null;
let geoLoaded: MapGeo | null = null;

function loadGeo(): Promise<MapGeo> {
  geoCache ??= fetch("/geo/markets.json")
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
      throw err;
    });
  return geoCache;
}

function useGeo(): GeoState {
  const [state, setState] = useState<GeoState>(
    geoLoaded ? { status: "ready", geo: geoLoaded } : { status: "loading" },
  );
  useEffect(() => {
    if (geoLoaded) return;
    let live = true;
    loadGeo().then(
      (geo) => live && setState({ status: "ready", geo }),
      () => live && setState({ status: "error" }),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}

function legendFor(map: OverviewVM["map"]): LegendBin[] {
  if (map.metric === "attainment") return ATTAINMENT_LEGEND;
  if (map.metric === "growth") return GROWTH_LEGEND;
  return revenueLegend(map.maxRevenue);
}

function MarketsTable({ map }: { map: OverviewVM["map"] }) {
  return (
    <Table scrollLabel="Markets table">
      <TableCaption className="sr-only">
        Markets, {map.periodLabel}. Source · data.json
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Market</TableHead>
          <TableHead scope="col">Region</TableHead>
          <TableHead scope="col">Status</TableHead>
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
            <TableCell className="text-ink-2">{r.region}</TableCell>
            <TableCell>
              <Badge variant={r.status}>
                <span aria-hidden className={`size-2 rounded-pill ${DOT[r.status]}`} />
                {r.statusLabel}
              </Badge>
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

export function MapCard({ map }: { map: OverviewVM["map"] }) {
  const { setContext } = useConsoleContext();
  const geoState = useGeo();
  const tableId = useId();
  const [pressed, setPressed] = useState(false);
  const metricLabel = METRIC_LABEL[map.metric];

  const legend: LegendItem[] = legendFor(map).map((b) => ({
    label: b.label,
    swatch: "fill",
    color: b.token,
  }));

  const metricControl = (
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
      <Choropleth
        geo={geoState.geo}
        values={map.values}
        metric={map.metric}
        metricLabel={metricLabel}
        periodLabel={map.periodLabel}
        selected={map.selected}
        focus={map.focus}
        height={MAP_HEIGHT}
        onSelect={(market) => setContext({ market })}
      />
    ) : (
      <Skeleton aria-hidden className="aspect-[2/1] w-full" />
    );

  const legendEl = (
    <div className="mx-auto mt-2 flex w-full max-w-[40rem] justify-center">
      <Legend items={legend} label={`${metricLabel} colour scale`} />
    </div>
  );

  const forced = geoState.status === "error";
  const showTable = forced || pressed;

  return (
    <section
      aria-labelledby="map-h"
      className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-[var(--pad-card)]"
    >
      <CardHeader
        title={`Markets by ${metricLabel.toLowerCase()}`}
        titleId="map-h"
        subtitle={`${map.periodLabel} · click a market to drill`}
        actions={
          <>
            {metricControl}
            {forced ? null : (
              <ViewAsTableToggle
                pressed={pressed}
                controls={tableId}
                onPressedChange={setPressed}
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
