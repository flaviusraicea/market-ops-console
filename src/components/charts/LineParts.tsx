"use client";

import { memo } from "react";

import { formatMoneyAxis } from "@/lib/format";
import type { scaleLinear } from "@visx/scale";
import type { LineAnomaly, LinePoint } from "./LineChart";

const X_LABELS = [0, 6, 12, 18, 23];

export type YScale = ReturnType<typeof scaleLinear<number>>;
export type SeriesKey = "actual" | "forecast" | "priorYear";
// Painted in this order: Forecast last, so where it meets Actual (most months at portfolio level) its dashes
// stay visible on top of the solid line instead of disappearing under it.
export const SERIES = [
  { key: "priorYear", color: "var(--series-prior)", width: 1, dash: "1 3" },
  { key: "actual", color: "var(--series-actual)", width: 2, dash: undefined },
  { key: "forecast", color: "var(--series-forecast)", width: 1.5, dash: "4 4" },
] as const;

/**
 * The grid, tick labels and month labels. They depend on the data and the width only, so a tooltip or crosshair
 * move in the parent does not touch them.
 */
export const LineGrid = memo(function LineGrid({
  ticks,
  y,
  x,
  points,
  innerW,
  innerH,
}: {
  ticks: readonly number[];
  y: YScale;
  x: (i: number) => number;
  points: readonly LinePoint[];
  innerW: number;
  innerH: number;
}) {
  return (
    <>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
          <text
            x={-8}
            y={y(t)}
            dy="0.32em"
            textAnchor="end"
            className="num fill-ink-muted text-[length:var(--text-caption)]"
          >
            {formatMoneyAxis(t)}
          </text>
        </g>
      ))}
      {X_LABELS.map((i) => {
        const p = points[i];
        return p ? (
          <text
            key={i}
            x={x(i)}
            y={innerH + 20}
            textAnchor="middle"
            className="fill-ink-muted text-[length:var(--text-caption)]"
          >
            {p.label}
          </text>
        ) : null;
      })}
    </>
  );
});

/** The label's line box: 12/16 text, its baseline 12 px under the box top. */
const LABEL_H = 16;
const LABEL_ASCENT = 12;
/** Clear space between the label and the nearest line, and the leader's length and gap to the marker. */
const LABEL_GAP = 12;
const LEADER = 8;
const LEADER_GAP = 2;
/** The marker's radius, so the leader starts 2 px outside it. */
const MARKER_R = 4;

/**
 * Where an anomaly's label goes (Fable 06:25). Below the lowest of the three lines at that month, with 12 px
 * of clear space, when the plot has room; a dip usually leaves it open. Otherwise above the highest line by
 * 12 px, held inside the plot so it never reaches the card header. The leader is 8 px, ending 2 px short of the
 * marker, on the label's side.
 */
export function anomalyLabelPlacement(
  markerY: number,
  linesY: readonly number[],
  innerH: number,
): { top: boolean; baseline: number; leader: [number, number] } {
  const lowest = Math.max(...linesY);
  const highest = Math.min(...linesY);
  const belowTop = lowest + LABEL_GAP;
  if (belowTop + LABEL_H <= innerH) {
    const start = markerY + MARKER_R + LEADER_GAP;
    return { top: false, baseline: belowTop + LABEL_ASCENT, leader: [start, start + LEADER] };
  }
  const aboveTop = Math.max(highest - LABEL_GAP - LABEL_H, 0);
  const start = markerY - MARKER_R - LEADER_GAP;
  return { top: true, baseline: aboveTop + LABEL_ASCENT, leader: [start, start - LEADER] };
}

/** The three series paths and the anomaly labels: the marks. Re-rendered only when the data or the size change. */
export const LineSeries = memo(function LineSeries({
  paths,
  anomalies,
  points,
  x,
  y,
  innerW,
  innerH,
}: {
  paths: Record<SeriesKey, string>;
  anomalies: readonly LineAnomaly[];
  points: readonly LinePoint[];
  x: (i: number) => number;
  y: YScale;
  innerW: number;
  innerH: number;
}) {
  return (
    <>
      {SERIES.map((s) => {
        const d = paths[s.key];
        return (
          <path
            key={s.key}
            data-series={s.key}
            className="tween-path"
            d={d}
            // The d attribute is the fallback; the CSS property is what transitions.
            style={{ d: `path("${d}")` }}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinejoin="round"
            {...(s.dash ? { strokeDasharray: s.dash } : {})}
          />
        );
      })}
      {anomalies.map((a) => {
        const p = points[a.index];
        if (!p) return null;
        const ax = x(a.index);
        const ay = y(p.actual);
        const { top, baseline, leader } = anomalyLabelPlacement(
          ay,
          [y(p.actual), y(p.forecast), y(p.priorYear)],
          innerH,
        );
        // The label opens to the right; near the right edge it opens to the left so it is never clipped.
        const dir = ax + 100 > innerW ? -1 : 1;
        return (
          <g key={a.period} aria-hidden>
            {/* Under 480 px of plot the label would crowd the line: the marker, its button and tooltip stay. */}
            <line
              {...(innerW < 480 ? { display: "none" } : {})}
              x1={ax}
              y1={leader[0]}
              x2={ax}
              y2={leader[1]}
              stroke="var(--ink-muted)"
              strokeWidth={1}
            />
            <text
              data-slot="anomaly-label"
              {...(innerW < 480 ? { display: "none" } : {})}
              x={ax + dir * 8}
              y={baseline}
              data-placement={top ? "above" : "below"}
              textAnchor={dir === 1 ? "start" : "end"}
              fill="var(--bad-text)"
              stroke="var(--surface)"
              strokeWidth={5}
              strokeLinejoin="round"
              paintOrder="stroke"
              className="text-[length:var(--text-label)] font-medium"
            >
              {a.label}
            </text>
          </g>
        );
      })}
    </>
  );
});
