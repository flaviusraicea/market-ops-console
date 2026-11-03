"use client";

import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { line } from "@visx/shape";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

import { TriangleAlert, ICON_STROKE } from "@/components/icons";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoneyAxis, formatMoneyCompact, formatMoneyFull, formatPct } from "@/lib/format";
import { ChartTooltip, useChartTooltip } from "./ChartTooltip";
import { Frame, type Margins } from "./Frame";
import type { LegendItem } from "./Legend";

export type LinePoint = {
  period: string;
  /** Axis label, "Jun 24". */
  label: string;
  /** Full label, "Jun 2024". */
  name: string;
  actual: number;
  forecast: number;
  priorYear: number;
  /** Percent, one decimal. */
  attainment: number;
};

export type LineAnomaly = {
  period: string;
  index: number;
  /** Month-on-month change in revenue, percent. */
  momPct: number | undefined;
  /** Short chart label, "−27% vs Feb". */
  label: string;
  /** Accessible name of the marker. */
  ariaLabel: string;
};

export const SERIES_LEGEND: LegendItem[] = [
  { label: "Actual", swatch: "line-solid", color: "--series-actual" },
  { label: "Forecast", swatch: "line-dashed", color: "--series-forecast" },
  { label: "Prior year", swatch: "line-dotted", color: "--series-prior" },
];

type LineChartProps = {
  points: readonly LinePoint[];
  anomalies: readonly LineAnomaly[];
  /** The period in the URL context. The crosshair rests here and keyboard navigation starts here. */
  selectedPeriod: string;
  /** Set while a followed citation lands here: the tooltip opens at this period. */
  landedPeriod?: string;
  title: string;
  desc: string;
  onPeriod: (period: string) => void;
  /**
   * Asks about an anomaly: its tooltip gains an action and Shift+Enter on the focused marker does the same.
   * `subject` names the entity in the action label.
   */
  ask?: {
    subject: string;
    onAsk: (anomaly: { period: string; momPct: number | undefined }) => void;
  };
};

const HEIGHT = 260;
const MARGIN: Margins = { top: 16, right: 16, bottom: 32, left: 48 };
const X_LABELS = [0, 6, 12, 18, 23];

function LineSvg({
  width,
  points,
  anomalies,
  selectedPeriod,
  landedPeriod,
  title,
  desc,
  onPeriod,
  ask,
}: LineChartProps & { width: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const tip = useChartTooltip();
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 1);
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const n = points.length;
  const step = innerW / n;

  const selectedIndex = Math.max(
    points.findIndex((p) => p.period === selectedPeriod),
    0,
  );
  // Keyboard position follows the URL period; it only differs while the user is moving with the arrows.
  const [moved, setMoved] = useState<{ from: string; index: number } | null>(null);
  const active = moved && moved.from === selectedPeriod ? moved.index : selectedIndex;
  const [cursor, setCursor] = useState<number | null>(null);

  const yMax = Math.max(...points.flatMap((p) => [p.actual, p.forecast, p.priorYear]), 1);
  const y = scaleLinear<number>({ domain: [0, yMax], range: [innerH, 0], nice: 5 });
  const ticks = y.ticks(5);
  const x = (i: number) => step * (i + 0.5);

  function askAbout(a: LineAnomaly) {
    ask?.onAsk({ period: a.period, momPct: a.momPct });
  }

  function reveal(index: number, anchorY?: number, anomaly?: LineAnomaly) {
    const p = points[index];
    if (!p) return;
    setCursor(index);
    tip.show(
      {
        title: p.name,
        rows: [
          { label: "Actual", value: formatMoneyCompact(p.actual) },
          { label: "Forecast", value: formatMoneyCompact(p.forecast) },
          { label: "Prior year", value: formatMoneyCompact(p.priorYear) },
          { label: "Attainment", value: formatPct(p.attainment, { sign: false }) },
        ],
        ...(anomaly && ask
          ? {
              action: {
                label: `Ask about ${ask.subject}, ${p.name}`,
                hint: "⇧↩",
                onActivate: () => askAbout(anomaly),
              },
            }
          : {}),
      },
      MARGIN.left + x(index),
      MARGIN.top + (anchorY ?? y(p.actual)),
    );
  }

  function hide() {
    setCursor(null);
    tip.hide();
  }

  // A citation landing opens the tooltip at its month, and closes it again when the landing ends.
  useEffect(() => {
    if (landedPeriod === undefined) return;
    const index = points.findIndex((p) => p.period === landedPeriod);
    if (index < 0) return;
    // Syncing a prop to the imperative tooltip; reveal and hide are recreated every render, the landing re-runs this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reveal(index);
    return hide;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landedPeriod, points]);

  function indexAt(e: MouseEvent<HTMLElement>): number {
    const box = e.currentTarget.getBoundingClientRect();
    return Math.min(Math.max(Math.floor((e.clientX - box.left) / step), 0), n - 1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const move = (next: number) => {
      e.preventDefault();
      const index = Math.min(Math.max(next, 0), n - 1);
      setMoved({ from: selectedPeriod, index });
      reveal(index);
    };
    switch (e.key) {
      case "ArrowRight":
        return move(active + 1);
      case "ArrowLeft":
        return move(active - 1);
      case "Home":
        return move(0);
      case "End":
        return move(n - 1);
      case "Enter":
      case " ": {
        e.preventDefault();
        const p = points[active];
        if (p) onPeriod(p.period);
      }
    }
  }

  const activePoint = points[active];
  const valueText = activePoint
    ? `${activePoint.name}: actual ${formatMoneyCompact(activePoint.actual)}, forecast ${formatMoneyCompact(activePoint.forecast)}, prior year ${formatMoneyCompact(activePoint.priorYear)}, attainment ${formatPct(activePoint.attainment, { sign: false })}`
    : "";

  const seriesPath = (key: "actual" | "forecast" | "priorYear") =>
    line<LinePoint>({ x: (_, i) => x(i), y: (p) => y(p[key]) })(points) ?? "";

  const series = [
    { key: "actual", color: "var(--series-actual)", width: 2, dash: undefined },
    { key: "forecast", color: "var(--series-forecast)", width: 2, dash: "6 4" },
    { key: "priorYear", color: "var(--series-prior)", width: 1.5, dash: "2 3" },
  ] as const;

  return (
    <div ref={wrapRef} className="relative" style={{ width, height: HEIGHT }}>
      <Frame width={width} height={HEIGHT} title={title} desc={desc} margin={MARGIN} role="group">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text
              x={-8}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              className="fill-ink-muted text-[length:var(--text-caption)]"
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
        {points[selectedIndex] ? (
          <line
            data-slot="selected-period"
            x1={x(selectedIndex)}
            x2={x(selectedIndex)}
            y1={0}
            y2={innerH}
            stroke="var(--accent)"
            strokeWidth={1}
            opacity={0.6}
          />
        ) : null}
        {cursor !== null ? (
          <line
            data-slot="crosshair"
            x1={x(cursor)}
            x2={x(cursor)}
            y1={0}
            y2={innerH}
            stroke="var(--ink-muted)"
            strokeWidth={1}
          />
        ) : null}
        {series.map((s) => {
          const d = seriesPath(s.key);
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
          // The label sits 28px above and 8px beside the marker, opening to the right; near the right
          // edge it opens to the left so it is never clipped.
          const dir = ax + 100 > innerW ? -1 : 1;
          return (
            <g key={a.period} aria-hidden>
              <line
                x1={ax + dir * 2}
                y1={ay - 4}
                x2={ax + dir * 8}
                y2={ay - 26}
                stroke="var(--bad-mark)"
                strokeWidth={1}
              />
              <text
                data-slot="anomaly-label"
                x={ax + dir * 8}
                y={ay - 28}
                textAnchor={dir === 1 ? "start" : "end"}
                fill="var(--bad-text)"
                stroke="var(--surface)"
                strokeWidth={3}
                paintOrder="stroke"
                className="text-[length:var(--text-label)] font-medium"
              >
                {a.label}
              </text>
            </g>
          );
        })}
      </Frame>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Month"
        aria-describedby={hintId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={n - 1}
        aria-valuenow={active}
        aria-valuetext={valueText}
        data-slot="chart-cursor"
        className="absolute cursor-crosshair"
        style={{ left: MARGIN.left, top: MARGIN.top, width: innerW, height: innerH }}
        onMouseMove={(e) => reveal(indexAt(e))}
        onMouseLeave={hide}
        onFocus={() => reveal(active)}
        onBlur={hide}
        onClick={(e) => {
          const p = points[indexAt(e)];
          if (p) onPeriod(p.period);
        }}
        onKeyDown={onKeyDown}
      />
      <span id={hintId} className="sr-only">
        Left and right arrows move between months. Enter selects the month.
      </span>
      {anomalies.length ? (
        <svg
          width={width}
          height={HEIGHT}
          className="pointer-events-none absolute inset-0"
          role="presentation"
        >
          {anomalies.map((a) => {
            const p = points[a.index];
            if (!p) return null;
            return (
              <g
                key={a.period}
                role="button"
                tabIndex={0}
                aria-label={a.ariaLabel}
                data-period={a.period}
                className="pointer-events-auto cursor-pointer"
                onFocus={() => reveal(a.index, y(p.actual), a)}
                onBlur={() => {
                  setCursor(null);
                  tip.hideSoon();
                }}
                onMouseEnter={() => reveal(a.index, y(p.actual), a)}
                onMouseLeave={() => {
                  setCursor(null);
                  tip.hideSoon();
                }}
                onClick={() => onPeriod(a.period)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (e.key === "Enter" && e.shiftKey && ask) askAbout(a);
                    else onPeriod(a.period);
                  }
                }}
              >
                <circle
                  cx={MARGIN.left + x(a.index)}
                  cy={MARGIN.top + y(p.actual)}
                  r={12}
                  fill="transparent"
                />
                <circle
                  cx={MARGIN.left + x(a.index)}
                  cy={MARGIN.top + y(p.actual)}
                  r={4}
                  fill="var(--bad-mark)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              </g>
            );
          })}
        </svg>
      ) : null}
      {tip.open && tip.content ? (
        <ChartTooltip {...tip.content} left={tip.left} top={tip.top} onHover={tip.hover} />
      ) : null}
    </div>
  );
}

/** Design-system 6.10. Hover or arrow keys move the crosshair; activating a month calls onPeriod. */
export function LineChart(props: LineChartProps) {
  return (
    <div className="w-full">
      <ParentSize debounceTime={50} parentSizeStyles={{ width: "100%", height: HEIGHT }}>
        {({ width }) => (width > 0 ? <LineSvg {...props} width={width} /> : null)}
      </ParentSize>
    </div>
  );
}

/** The same 24 rows as the chart, with the anomaly row flagged. */
export function LineChartTable({
  caption,
  points,
  anomalies,
}: {
  caption: string;
  points: readonly LinePoint[];
  anomalies: readonly LineAnomaly[];
}) {
  const flagged = new Set(anomalies.map((a) => a.period));
  return (
    <Table>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Period</TableHead>
          <TableHead scope="col" className="text-right">
            Actual
          </TableHead>
          <TableHead scope="col" className="text-right">
            Forecast
          </TableHead>
          <TableHead scope="col" className="text-right">
            Prior year
          </TableHead>
          <TableHead scope="col" className="text-right">
            Attainment
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {points.map((p) => (
          <TableRow key={p.period}>
            <TableCell className="font-medium">
              <span className="inline-flex items-center gap-1.5">
                {p.name}
                {flagged.has(p.period) ? (
                  <>
                    <TriangleAlert
                      aria-hidden
                      className="size-3.5 text-bad-text"
                      strokeWidth={ICON_STROKE}
                    />
                    <span className="sr-only">Anomaly</span>
                  </>
                ) : null}
              </span>
            </TableCell>
            <TableCell className="text-right num">{formatMoneyFull(p.actual)}</TableCell>
            <TableCell className="text-right num">{formatMoneyFull(p.forecast)}</TableCell>
            <TableCell className="text-right num">{formatMoneyFull(p.priorYear)}</TableCell>
            <TableCell className="text-right num">
              {formatPct(p.attainment, { sign: false })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
