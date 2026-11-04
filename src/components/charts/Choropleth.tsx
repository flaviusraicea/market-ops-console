"use client";

import { localPoint } from "@visx/event";
import { ParentSize } from "@visx/responsive";
import { geoArea, geoNaturalEarth1, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from "react";

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
const MAX_HEIGHT = 420;
/** Room around the fitted markets, so a border market's outline and focus ring stay inside the plot. */
const PAD = 24;

/**
 * The part of a market that frames the map: its largest polygon. France's overseas departments and Alaska's
 * islands would otherwise stretch a drilled Europe across the Atlantic.
 */
function mainland(f: Feature<Geometry>): Feature<Geometry> {
  if (f.geometry.type !== "MultiPolygon") return f;
  let best = f.geometry.coordinates[0];
  let bestArea = -1;
  for (const coordinates of f.geometry.coordinates) {
    const area = geoArea({ type: "Polygon", coordinates });
    if (area > bestArea) {
      bestArea = area;
      best = coordinates;
    }
  }
  return best ? { ...f, geometry: { type: "Polygon", coordinates: best } } : f;
}

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

  // The map frames the markets that matter, not the world: all of the portfolio's markets, or the drilled
  // region's. Land outside the frame is clipped by the SVG, so Europe's five markets fill the card on a drill.
  const framed = useMemo<FeatureCollection | undefined>(() => {
    const shown = focus ? markets.filter((f) => focus.includes(marketIdOf(f) ?? "")) : markets;
    const features = shown.length ? shown : markets;
    return features.length
      ? { type: "FeatureCollection", features: features.map(mainland) }
      : land
        ? { type: "FeatureCollection", features: [land] }
        : undefined;
  }, [markets, focus, land]);

  const { path, scale, translate } = useMemo(() => {
    const projection = geoNaturalEarth1();
    if (framed && width > 0) {
      projection.fitExtent(
        [
          [PAD, PAD],
          [width - PAD, height - PAD],
        ],
        framed,
      );
    }
    return {
      path: geoPath(projection),
      scale: projection.scale(),
      translate: projection.translate(),
    };
  }, [framed, width, height]);

  // A change of frame (a drill or going back up) moves the map from the old view to the new one in
  // --dur-chart, which is 0 under reduced motion. Same projection, so the old view is an affine copy of the
  // new: draw the new paths, start the group on that copy (FLIP) and let it settle to none. A resize does not
  // animate.
  const plotRef = useRef<SVGGElement>(null);
  const last = useRef<{
    scale: number;
    translate: [number, number];
    width: number;
    height: number;
  }>(null);
  useLayoutEffect(() => {
    const g = plotRef.current;
    const prev = last.current;
    last.current = { scale, translate, width, height };
    if (!g || !prev || prev.width !== width || prev.height !== height || prev.scale === scale)
      return;
    const k = prev.scale / scale;
    const tx = prev.translate[0] - k * translate[0];
    const ty = prev.translate[1] - k * translate[1];
    // Hold the old view before paint, then start the move two frames later: the drill also re-renders the
    // other charts, and a transition that starts in the same frames as that commit drops frames.
    g.style.transition = "none";
    g.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        g.style.transition = "transform var(--dur-chart) var(--ease-out)";
        g.style.transform = "";
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      g.style.transition = "none";
      g.style.transform = "";
    };
  }, [scale, translate, width, height]);

  // Path strings are the expensive part (d3-geo projects every vertex), and a tooltip move re-renders this
  // component, so they are built once per geometry and size.
  const landD = useMemo(() => (land ? (path(land) ?? "") : ""), [land, path]);
  const marketD = useMemo(() => markets.map((f) => path(f) ?? ""), [markets, path]);

  // Where each market's tooltip points: the middle and top of its mainland, so France's sits on France, not
  // between France and French Guiana. A market whose mainland falls outside the frame after a drill is not
  // drawn in view, so it leaves the keyboard order and the accessible map: Tab never lands on a hidden mark.
  const anchors = useMemo(
    () =>
      markets.map((f) => {
        const m = mainland(f);
        const [x, y] = path.centroid(m);
        const top = path.bounds(m)[0][1];
        return { x, top, inView: x >= 0 && x <= width && y >= 0 && y <= height };
      }),
    [markets, path, width, height],
  );
  const reachable = useMemo(
    () => markets.flatMap((_, i) => (anchors[i]?.inView ? [i] : [])),
    [markets, anchors],
  );

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

  // The keyboard walks the markets in view; its indices are positions in `reachable`.
  const keyboard = useChartKeyboard({
    count: reachable.length,
    onActivate: (k) => {
      const f = markets[reachable[k] ?? -1];
      const id = f && marketIdOf(f);
      if (id) onSelect(id);
    },
    onMove: (k) => pathRefs.current[reachable[k] ?? -1]?.focus(),
    // Tab lands on the selected market, not the first one in the list.
    initialIndex: Math.max(
      reachable.findIndex((i) => marketIdOf(markets[i]!) === selected),
      0,
    ),
  });

  function onFocus(index: number, e: FocusEvent<SVGPathElement>) {
    keyboard.setActiveIndex(Math.max(reachable.indexOf(index), 0));
    setRingIndex(e.currentTarget.matches(":focus-visible") ? index : null);
    const a = anchors[index];
    if (a) showFor(index, a.x, Math.max(a.top, 0));
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
        <g ref={plotRef} style={{ transformOrigin: "0 0" }}>
          {land ? (
            <path
              d={landD}
              fill="var(--map-land)"
              stroke="var(--border)"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          {markets.map((f, i) => {
            const id = marketIdOf(f)!;
            const v = values[id]!;
            const isSelected = selected === id;
            const dim = !!focus && !focus.includes(id);
            const k = reachable.indexOf(i);
            return (
              <path
                key={id}
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
                d={marketD[i] ?? ""}
                {...(k < 0
                  ? { "aria-hidden": true }
                  : {
                      role: "button",
                      tabIndex: k === keyboard.activeIndex ? 0 : -1,
                      "aria-pressed": isSelected,
                    })}
                aria-label={`${v.name}, ${v.statusLabel.toLowerCase()}, ${v.label}`}
                data-dim={dim}
                fillOpacity={dim ? 0.6 : 1}
                fill={`var(${scheme === "status" ? STATUS_FILL[v.status] : colourFor(metric, v.value, max)})`}
                stroke={isSelected ? "var(--accent)" : "var(--surface)"}
                strokeWidth={isSelected ? 2 : 1}
                vectorEffect="non-scaling-stroke"
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
                  if (k < 0) return;
                  setRingIndex(i);
                  keyboard.onKeyDown(e, k);
                }}
              />
            );
          })}
        </g>
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
        // Without a fixed height the minimum is 220 px on a phone and 320 px from 1024 px, where a drilled
        // region needs the room.
        className={fixedHeight ? "" : "min-h-[220px] lg:min-h-[320px]"}
        parentSizeStyles={{
          width: "100%",
          ...(fixedHeight
            ? { height: fixedHeight }
            : { aspectRatio: `1 / ${HEIGHT_RATIO}`, maxHeight: MAX_HEIGHT }),
        }}
      >
        {({ width, height }) =>
          width > 0 && height > 0 ? <MapSvg {...props} width={width} height={height} /> : null
        }
      </ParentSize>
    </div>
  );
}
