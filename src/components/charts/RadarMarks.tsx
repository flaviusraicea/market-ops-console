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
export const RINGS = [0.5, 1];
/** Clockwise from the top, one angle per axis. */
export const angleOf = (axis: number, count: number) =>
  ((-90 + (360 / count) * axis) * Math.PI) / 180;

export type Geometry = { cx: number; cy: number; radius: number; n: number };

export const pointAt = (
  { cx, cy, radius, n }: Geometry,
  axis: number,
  r: number,
): [number, number] => [
  cx + Math.cos(angleOf(axis, n)) * radius * r,
  cy + Math.sin(angleOf(axis, n)) * radius * r,
];

export const polyAt = (g: Geometry, rs: readonly number[]) =>
  svgPath(
    rs.map((r, a) => pointAt(g, a, r)),
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
}: {
  axes: readonly string[];
  series: readonly RadarSeries[];
  geometry: Geometry;
}) {
  const { cx, cy, n } = geometry;
  const hasSelection = series.some((s) => s.selected);
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
        const [lx, ly] = pointAt(geometry, a, 1.18);
        const cos = Math.cos(angleOf(a, n));
        const sin = Math.sin(angleOf(a, n));
        const anchor = Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end";
        const lines = splitLabel(label);
        const extra = (lines.length - 1) * 1.1;
        // Top labels grow upwards, bottom labels downwards, side labels stay centred on the axis.
        const dy = sin < -0.5 ? `${-0.2 - extra}em` : sin > 0.5 ? "0.9em" : `${0.32 - extra / 2}em`;
        return (
          <g key={label}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--grid)" strokeWidth={1} />
            <text
              data-axis={label}
              x={lx}
              y={ly}
              textAnchor={anchor}
              className="fill-ink-2 text-[length:var(--text-label)] font-medium"
            >
              {lines.map((line, i) => (
                <tspan key={line} x={lx} dy={i === 0 ? dy : "1.1em"}>
                  {line}
                </tspan>
              ))}
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
