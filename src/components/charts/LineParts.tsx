"use client";

import { memo, useId } from "react";

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
/** Clear space between the label and the nearest line. */
const LABEL_GAP = 12;
/** The label starts this far to the side of its marker. */
export const LABEL_INSET = 8;
/** The marker's radius, and the leader's clearance from the marker and from the text. */
const MARKER_R = 4;
const LEADER_FROM_MARKER = 2;
const LEADER_TO_TEXT = 4;

/**
 * Where an anomaly's label and leader go. The label sits below the lowest of the three lines at that month,
 * with 12 px of clear space, when the plot has room; a dip usually leaves it open. Otherwise it sits 12 px
 * above the highest line, held inside the plot so it never reaches the card header. `dir` is 1 when the label
 * opens to the right of the marker, -1 to the left. The leader is one straight segment that always joins the
 * two: from 2 px outside the marker, on the label's side, to the label's nearest corner (its inner bottom
 * corner above the marker, its inner top corner below), ending 4 px clear of the text.
 */
export function anomalyLabelPlacement(
  marker: { x: number; y: number },
  linesY: readonly number[],
  innerH: number,
  dir: 1 | -1,
): { top: boolean; baseline: number; leader: { x1: number; y1: number; x2: number; y2: number } } {
  const lowest = Math.max(...linesY);
  const highest = Math.min(...linesY);
  const x2 = marker.x + dir * LABEL_INSET;
  const belowTop = lowest + LABEL_GAP;
  if (belowTop + LABEL_H <= innerH) {
    return {
      top: false,
      baseline: belowTop + LABEL_ASCENT,
      leader: {
        x1: marker.x,
        y1: marker.y + MARKER_R + LEADER_FROM_MARKER,
        x2,
        y2: belowTop - LEADER_TO_TEXT,
      },
    };
  }
  const aboveTop = Math.max(highest - LABEL_GAP - LABEL_H, 0);
  return {
    top: true,
    baseline: aboveTop + LABEL_ASCENT,
    leader: {
      x1: marker.x,
      y1: marker.y - MARKER_R - LEADER_FROM_MARKER,
      x2,
      y2: aboveTop + LABEL_H + LEADER_TO_TEXT,
    },
  };
}

/** The three series paths and the anomaly labels: the marks. Re-rendered only when the data or the size change. */
export const LineSeries = memo(function LineSeries({
  paths,
  areaPath,
  anomalies,
  points,
  x,
  y,
  innerW,
  innerH,
}: {
  paths: Record<SeriesKey, string>;
  areaPath: string;
  anomalies: readonly LineAnomaly[];
  points: readonly LinePoint[];
  x: (i: number) => number;
  y: YScale;
  innerW: number;
  innerH: number;
}) {
  const gradientId = useId();
  return (
    <>
      <defs>
        <linearGradient id={`${gradientId}-actual-wash`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity={0.12} />
          <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        aria-hidden="true"
        data-slot="actual-wash"
        className="tween-path pointer-events-none"
        d={areaPath}
        style={{ d: `path("${areaPath}")` }}
        fill={`url(#${gradientId}-actual-wash)`}
      />
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
        // The label opens to the right; near the right edge it opens to the left so it is never clipped.
        const dir: 1 | -1 = ax + 100 > innerW ? -1 : 1;
        const { top, baseline, leader } = anomalyLabelPlacement(
          { x: ax, y: ay },
          [y(p.actual), y(p.forecast), y(p.priorYear)],
          innerH,
          dir,
        );
        // Under 480 px of plot the label would crowd the line: the marker, its button and tooltip stay.
        const hidden = innerW < 480 ? { display: "none" } : {};
        return (
          <g key={a.period} aria-hidden>
            {/* Over the series lines, under the label's halo, with its own surface halo. */}
            <line
              {...hidden}
              {...leader}
              stroke="var(--surface)"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line {...hidden} {...leader} stroke="var(--ink-muted)" strokeWidth={1} />
            <text
              data-slot="anomaly-label"
              {...hidden}
              x={ax + dir * LABEL_INSET}
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
