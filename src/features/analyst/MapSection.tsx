"use client";

import { useId } from "react";

import { Notice } from "@/components/Notice";
import { SegmentedControl } from "@/components/SegmentedControl";
import { LazyChoropleth, MapSkeleton } from "@/components/charts/LazyChoropleth";
import { Legend } from "@/components/charts/Legend";
import {
  TableView,
  ViewAsTableToggle,
  useTableFirstOnPhone,
} from "@/components/charts/ViewAsTable";
import type { Metric } from "@/domain";
import { METRIC_LABEL, MarketsTable, legendFor, useGeo } from "@/features/overview/MapCard";
import { RegionBars } from "@/features/overview/RegionBars";
import type { OverviewVM, RegionBarsVM } from "@/features/overview/viewModel";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { SheetSection } from "./Sheet";

/** The Analyst map section: the choropleth at 7/12 with the By region bars at 5/12 and the legend under the map. */
export function MapSection({ map, regions }: { map: OverviewVM["map"]; regions: RegionBarsVM }) {
  const { ctx, setContext } = useConsoleContext();
  const { pressed, auto, viewMap, toggle } = useTableFirstOnPhone();
  const geoState = useGeo(auto);
  const tableId = useId();
  const metricLabel = METRIC_LABEL[map.metric];
  const forced = geoState.status === "error";
  const showTable = forced || pressed;

  return (
    <SheetSection
      eyebrow="Map"
      allProducts={map.allProducts}
      subtitle={map.sheetSubtitle}
      actions={
        <>
          <SegmentedControl<Metric>
            ariaLabel="Map metric"
            value={ctx.metric}
            onChange={(metric) => setContext({ metric })}
            options={(Object.keys(METRIC_LABEL) as Metric[]).map((m) => ({
              value: m,
              label: METRIC_LABEL[m],
            }))}
          />
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
    >
      {forced ? (
        <Notice title="Map unavailable">The market table below has the same data.</Notice>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-4 min-[1024px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <TableView
          id={tableId}
          pressed={showTable}
          auto={auto && !forced}
          chart={
            forced ? null : (
              <>
                {geoState.status === "ready" ? (
                  <LazyChoropleth
                    geo={geoState.geo}
                    values={map.values}
                    metric={map.metric}
                    metricLabel={metricLabel}
                    periodLabel={map.periodLabel}
                    selected={ctx.market}
                    focus={map.focus}
                    onSelect={(market) => setContext({ market })}
                  />
                ) : (
                  <MapSkeleton />
                )}
                <div className="mt-3 flex w-full justify-center">
                  <Legend
                    label={`${metricLabel} colour scale`}
                    items={legendFor(map).map((b) => ({
                      label: b.label,
                      swatch: "fill",
                      color: b.token,
                    }))}
                  />
                </div>
              </>
            )
          }
          table={<MarketsTable map={map} />}
        />
        <RegionBars bars={regions} framed={false} />
      </div>
    </SheetSection>
  );
}
