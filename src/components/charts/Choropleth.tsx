"use client";

import { localPoint } from "@visx/event";
import { ParentSize } from "@visx/responsive";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useCallback, useMemo, useRef, useState, type FocusEvent, type MouseEvent } from "react";

import { ChartTooltip, useChartTooltip } from "./ChartTooltip";
import { Frame } from "./Frame";
import { colourFor } from "./scales";
import { useChartKeyboard } from "./useChartKeyboard";

/** GeoJSON with one land feature and one feature per market (public/geo/markets.<hash>.json). */
export type MapGeo = FeatureCollection;
export type MapMetric = "attainment" | "revenue" | "growth";
export type MapStatus = "on_track" | "at_risk" | "off_track";

export type MarketValue = {
  name: string;
  value: number;
  /** Accessible phrase for the metric, for example "92.0% attainment". */
  label: string;
  status: MapStatus;
  /** Status text, for example "Off track". Supplied by the caller so charts stay free of domain imports. */
  statusLabel: string;
  /** The metric value as shown in the tooltip, for example "92.0%". */
  display: string;
  /** Revenue as shown in the tooltip, for example "$1.68M". */
  revenue: string;
};

type ChoroplethProps = {
  geo: FeatureCollection;
  values: Record<string, MarketValue>;
  metric: MapMetric;
  metricLabel: string;
  /** `status` fills each market by its status instead of the metric value. */
  scheme?: "metric" | "status";
  /** Used in the chart description. */
  periodLabel: string;
  selected?: string | undefined;
  /** Markets drawn at full strength; the rest are dimmed. Omit to dim none. */
  focus?: readonly string[] | undefined;
  onSelect: (marketId: string) => void;
  /** Fixed height in px. Without it the map keeps a clamped aspect ratio. */
  height?: number;
};

const STATUS_FILL: Record<MapStatus, string> = {
  on_track: "--ok-mark",
  at_risk: "--warn-mark",
  off_track: "--bad-mark",
};

const HEIGHT_RATIO = 0.52;
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 420;
const PAD = 8;

function marketIdOf(f: Feature<Geometry>): string | undefined {
  const id = f.properties?.["marketId"];
  return typeof id === "string" ? id : undefined;
}

function MapSvg({
  width,
  height,
  geo,
  values,
  metric,
  metricLabel,
  scheme = "metric",
  periodLabel,
  selected,
  focus,
  onSelect,
}: ChoroplethProps & { width: number; height: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<Array<SVGPathElement | null>>([]);
  const tip = useChartTooltip();
  // Index of the market whose focus ring is drawn: keyboard focus only, so a click does not leave a ring behind.
  const [ringIndex, setRingIndex] = useState<number | null>(null);

  const { land, markets } = useMemo(() => {
    const land = geo.features.find((f) => f.properties?.["kind"] === "land");
    const markets = geo.features
      .filter(
        (f): f is Feature<Geometry> => marketIdOf(f) !== undefined && !!values[marketIdOf(f)!],
      )
      .sort((a, b) => values[marketIdOf(a)!]!.name.localeCompare(values[marketIdOf(b)!]!.name));
    return { land, markets };
  }, [geo, values]);

  const path = useMemo(() => {
    const projection = geoNaturalEarth1();
    if (land && width > 0) {
      projection.fitExtent(
        [
          [PAD, PAD],
          [width - PAD, height - PAD],
        ],
        land,
      );
    }
    return geoPath(projection);
  }, [land, width, height]);

  // Path strings are the expensive part (d3-geo projects every vertex), and a tooltip move re-renders this
  // component, so they are built once per geometry and size.
  const landD = useMemo(() => (land ? (path(land) ?? "") : ""), [land, path]);
  const marketD = useMemo(() => markets.map((f) => path(f) ?? ""), [markets, path]);

  const max = useMemo(() => Math.max(...Object.values(values).map((v) => v.value), 0), [values]);

  const counts = useMemo(() => {
    const c = { on_track: 0, at_risk: 0, off_track: 0 };
    for (const v of Object.values(values)) c[v.status] += 1;
    return c;
  }, [values]);

  const showFor = useCallback(
    (index: number, left: number, top: number) => {
      const f = markets[index];
      const v = f && values[marketIdOf(f)!];
      if (!v) return;
      tip.show(
        {
          title: v.name,
          rows: [
            { label: "Status", value: v.statusLabel },
            { label: metricLabel, value: v.display },
            { label: "Revenue", value: v.revenue },
          ],
        },
        left,
        top,
      );
    },
    [markets, values, metricLabel, tip],
  );

  const keyboard = useChartKeyboard({
    count: markets.length,
    onActivate: (i) => {
      const f = markets[i];
      const id = f && marketIdOf(f);
      if (id) onSelect(id);
    },
    onMove: (i) => pathRefs.current[i]?.focus(),
    // Tab lands on the selected market, not the first one in the list.
    initialIndex: Math.max(
      markets.findIndex((f) => marketIdOf(f) === selected),
      0,
    ),
  });

  function onFocus(index: number, e: FocusEvent<SVGPathElement>) {
    keyboard.setActiveIndex(index);
    setRingIndex(e.currentTarget.matches(":focus-visible") ? index : null);
    const wrap = wrapRef.current?.getBoundingClientRect();
    const box = e.currentTarget.getBoundingClientRect();
    if (wrap) showFor(index, box.left - wrap.left + box.width / 2, box.top - wrap.top);
  }

  function onMouse(index: number, e: MouseEvent<SVGPathElement>) {
    const p = localPoint(wrapRef.current ?? e.currentTarget, e);
    if (p) showFor(index, p.x, p.y);
  }

  const desc = `Choropleth of ${markets.length} markets coloured by ${scheme === "status" ? "status" : metricLabel.toLowerCase()} for ${periodLabel}. ${counts.on_track} on track, ${counts.at_risk} at risk, ${counts.off_track} off track. Table available via View as table.`;

  return (
    <div ref={wrapRef} className="relative" style={{ width, height }}>
      <Frame
        role="group"
        width={width}
        height={height}
        title={scheme === "status" ? "Markets by status" : `Markets by ${metricLabel}`}
        desc={desc}
      >
        {land ? (
          <path d={landD} fill="var(--map-land)" stroke="var(--border)" strokeWidth={0.5} />
        ) : null}
        {markets.map((f, i) => {
          const id = marketIdOf(f)!;
          const v = values[id]!;
          const isSelected = selected === id;
          const dim = !!focus && !focus.includes(id);
          return (
            <path
              key={id}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
              d={marketD[i] ?? ""}
              role="button"
              tabIndex={i === keyboard.activeIndex ? 0 : -1}
              aria-label={`${v.name}, ${v.statusLabel.toLowerCase()}, ${v.label}`}
              aria-pressed={isSelected}
              data-dim={dim}
              fillOpacity={dim ? 0.6 : 1}
              fill={`var(${scheme === "status" ? STATUS_FILL[v.status] : colourFor(metric, v.value, max)})`}
              stroke={isSelected ? "var(--accent)" : "var(--surface)"}
              strokeWidth={isSelected ? 2 : 1}
              className="tween-fill cursor-pointer"
              data-focus-ring="stroke"
              onMouseEnter={(e) => onMouse(i, e)}
              onMouseMove={(e) => onMouse(i, e)}
              onMouseLeave={tip.hide}
              onFocus={(e) => onFocus(i, e)}
              onBlur={() => {
                setRingIndex(null);
                tip.hide();
              }}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => {
                // A key press is keyboard use: draw the ring even if the market was focused by a click.
                setRingIndex(i);
                keyboard.onKeyDown(e, i);
              }}
            />
          );
        })}
        {ringIndex !== null && marketD[ringIndex] ? (
          // SVG has no z-order, so the ring is a copy of the focused outline drawn last. Native outlines on SVG
          // paths box the bounding rectangle; a stroke follows the country. A 2px focus stroke over a 4px surface halo keeps it visible on any fill.
          <g aria-hidden="true" pointerEvents="none" fill="none" strokeLinejoin="round">
            <path
              d={marketD[ringIndex]}
              stroke="var(--surface)"
              strokeWidth={4}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={marketD[ringIndex]}
              stroke="var(--focus)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ) : null}
      </Frame>
      {tip.open && tip.content ? (
        <ChartTooltip {...tip.content} left={tip.left} top={tip.top} />
      ) : null}
    </div>
  );
}

/** World map with the portfolio's markets filled by a metric. Keyboard: Tab enters, arrows move, Enter selects. */
export function Choropleth({ height: fixedHeight, ...props }: ChoroplethProps) {
  // ParentSize measures an absolutely positioned child, so the box needs its own height: a fixed
  // aspect ratio, clamped, which also keeps the map readable at phone width.
  return (
    <div className="w-full">
      <ParentSize
        debounceTime={50}
        parentSizeStyles={{
          width: "100%",
          ...(fixedHeight
            ? { height: fixedHeight }
            : { aspectRatio: `1 / ${HEIGHT_RATIO}`, minHeight: MIN_HEIGHT, maxHeight: MAX_HEIGHT }),
        }}
      >
        {({ width, height }) =>
          width > 0 && height > 0 ? <MapSvg {...props} width={width} height={height} /> : null
        }
      </ParentSize>
    </div>
  );
}
