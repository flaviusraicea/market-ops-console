"use client";

import { memo } from "react";

import type { RadarSeries } from "./RadarChart";
import { svgPath } from "./svgPath";

/** Long axis names break at the space nearest the middle so side labels stay inside the card. */
export function splitLabel(label: string): string[] {
  if (label.length <= 12 || !label.includes(" ")) return [label];
  const mid = label.length / 2;
  let best = -1;
  for (let i = 0; i < label.length; i++) {
    if (label[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return [label.slice(0, best), label.slice(best + 1)];
}
/** Below this card width the axis names shorten so they fit beside the ring; the full name stays as the label's title. */
export const SHORT_LABEL_BELOW = 304;
const SHORT_LABELS: Record<string, string> = {
  Attainment: "Attain",
  "Growth YoY": "Growth",
  "Share (given)": "Share",
  "Revenue share (derived)": "Rev share",
  "Month on month": "MoM",
  "Units YoY": "Units",
};
/** The lines an axis label is drawn on: one short name in a narrow card, else the full name split over two lines. */
export const labelLines = (label: string, short: boolean): string[] =>
  short ? [SHORT_LABELS[label] ?? label] : splitLabel(label);

export const RINGS = [0.5, 1];
/** The second line under the label of an axis with no value this period. */
export const NO_DATA = "no data";

/** Where an axis label is anchored: LABEL_GAP px past the ring. */
export const labelAt = ({ cx, cy, radius, n }: Geometry, axis: number): [number, number] => [
  cx + Math.cos(angleOf(axis, n)) * (radius + LABEL_GAP),
  cy + Math.sin(angleOf(axis, n)) * (radius + LABEL_GAP),
];
/** Clockwise from the top, one angle per axis. */
export const angleOf = (axis: number, count: number) =>
  ((-90 + (360 / count) * axis) * Math.PI) / 180;

export type Geometry = { cx: number; cy: number; radius: number; n: number };

/** Where a value sits on its axis. Values are clamped to the ring, so no mark can leave the chart. */
export const pointAt = (
  { cx, cy, radius, n }: Geometry,
  axis: number,
  value: number,
): [number, number] => {
  const r = Math.min(1, Math.max(0, value));
  return [
    cx + Math.cos(angleOf(axis, n)) * radius * r,
    cy + Math.sin(angleOf(axis, n)) * radius * r,
  ];
};

/** How far past the ring an axis label starts, in px. */
export const LABEL_GAP = 10;

export const polyAt = (g: Geometry, rs: readonly (number | null)[]) =>
  svgPath(
    // A null value skips its axis: the outline runs from the previous vertex to the next.
    rs.flatMap((r, a) => (r === null ? [] : [pointAt(g, a, r)])),
    true,
  );

/**
 * Rings, axis lines and labels, and the series polygons: the marks. They depend on the data and the width only,
 * so a tooltip opening on a dot does not redraw them.
 */
export const RadarMarks = memo(function RadarMarks({
  axes,
  series,
  geometry,
  short = false,
}: {
  axes: readonly string[];
  series: readonly RadarSeries[];
  geometry: Geometry;
  short?: boolean;
}) {
  const { cx, cy, n } = geometry;
  const hasSelection = series.some((s) => s.selected);
  // An axis some compared market has no value on stays drawn, quieter, with a dashed spoke. One nobody has a value
  // on this period is a "no data" axis: its spoke is a dashed border line and its label says so.
  const partial = axes.map((_, a) => series.some((s) => s.values[a] === null));
  const empty = axes.map((_, a) => series.length > 0 && series.every((s) => s.values[a] === null));
  return (
    <>
      {RINGS.map((r) => (
        <g key={r}>
          <path
            d={polyAt(
              geometry,
              axes.map(() => r),
            )}
            fill="none"
            stroke="var(--grid)"
            strokeWidth={1}
          />
        </g>
      ))}
      {axes.map((label, a) => {
        const [x, y] = pointAt(geometry, a, 1);
        const [lx, ly] = labelAt(geometry, a);
        const cos = Math.cos(angleOf(a, n));
        const sin = Math.sin(angleOf(a, n));
        const anchor = Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end";
        const lines = empty[a] ? [...labelLines(label, short), NO_DATA] : labelLines(label, short);
        const extra = (lines.length - 1) * 1.1;
        // Top labels grow upwards, bottom labels downwards, side labels stay centred on the axis.
        const dy = sin < -0.5 ? `${-0.2 - extra}em` : sin > 0.5 ? "0.9em" : `${0.32 - extra / 2}em`;
        return (
          <g key={label}>
            <line
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke={empty[a] ? "var(--border)" : "var(--grid)"}
              strokeWidth={1}
              {...(partial[a] ? { strokeDasharray: "2 3" } : {})}
            />
            <text
              data-axis={label}
              x={lx}
              y={ly}
              textAnchor={anchor}
              className={`${partial[a] ? "fill-ink-muted" : "fill-ink-2"} text-[length:var(--text-label)] font-medium`}
            >
              <title>{label}</title>
              {lines.map((line, i) =>
                line === NO_DATA ? (
                  <tspan
                    key={line}
                    x={lx}
                    dy="1.25em"
                    className="text-[length:var(--text-caption)]"
                  >
                    {line}
                  </tspan>
                ) : (
                  <tspan key={line} x={lx} dy={i === 0 ? dy : "1.1em"}>
                    {line}
                  </tspan>
                ),
              )}
            </text>
          </g>
        );
      })}
      {/* The selected market is drawn last so it sits on top of its peers. */}
      {[...series]
        .sort((a, b) => Number(a.selected ?? false) - Number(b.selected ?? false))
        .map((s) => {
          const emphasised = s.selected || !hasSelection;
          return (
            <path
              key={s.id}
              data-series={s.id}
              d={polyAt(geometry, s.values)}
              fill={`var(${s.color})`}
              fillOpacity={s.selected ? 0.2 : 0.12}
              stroke={`var(${s.color})`}
              strokeWidth={s.selected ? 3 : 2}
              strokeOpacity={emphasised ? 1 : 0.55}
              strokeLinejoin="round"
            />
          );
        })}
    </>
  );
});
