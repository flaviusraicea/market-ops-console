"use client";

import { ParentSize } from "@visx/responsive";
import { memo, useCallback, useMemo, useRef, type FocusEvent, type MouseEvent } from "react";

import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PIN_CELL_CLASS, PIN_HEAD_TINTED_CLASS, ScrollTable } from "@/components/ui/scroll-table";
import { cn } from "@/components/cn";
import { ChartTooltip, useChartTooltip } from "./ChartTooltip";
import { PanelMotion } from "./PanelMotion";
import { Frame } from "./Frame";
import {
  LABEL_GAP,
  NO_DATA,
  RadarMarks,
  SHORT_LABEL_BELOW,
  angleOf,
  labelLines,
  pointAt,
  type Geometry,
} from "./RadarMarks";
import { useChartKeyboard } from "./useChartKeyboard";

export type RadarSeries = {
  id: string;
  name: string;
  /** A CSS custom property such as `--cat-1`. */
  color: string;
  /** Normalised per axis; null where the market has no value, so its polygon skips that axis. */
  values: readonly (number | null)[];
  /** Formatted raw values, in axis order. */
  raw: readonly string[];
  selected?: boolean;
};

type RadarChartProps = {
  axes: readonly string[];
  series: readonly RadarSeries[];
  title: string;
  desc: string;
};

const HEIGHT = 340;
/** Room kept around the ring for the axis labels, in px. */
const LABEL_RESERVE = 56;
/** The reserve when the labels are short names. */
const SHORT_LABEL_RESERVE = 32;
/** A label's width estimate per character at --text-label (12px Inter, medium); errs wide. */
const CHAR_PX = 7;
const EDGE_PX = 4;

/**
 * The ring's radius: half the smaller side less the label reserve, then shrunk further if a side label would still
 * cross the chart's edge, down to a 24 px floor. A narrow card (the panel open) draws a smaller radar, not a clipped
 * one, until the floor is reached.
 */
export function fitRadius(
  width: number,
  axes: readonly string[],
  short = width < SHORT_LABEL_BELOW,
): number {
  let radius = Math.min(width, HEIGHT) / 2 - (short ? SHORT_LABEL_RESERVE : LABEL_RESERVE);
  axes.forEach((label, a) => {
    const cos = Math.abs(Math.cos(angleOf(a, axes.length)));
    if (cos < 0.3) return; // top and bottom labels are centred on their spoke
    const text =
      Math.max(...labelLines(label, short).map((l) => l.length), NO_DATA.length) * CHAR_PX;
    radius = Math.min(radius, (width / 2 - EDGE_PX - text) / cos - LABEL_GAP);
  });
  return Math.max(radius, 24);
}

const RadarSvg = memo(function RadarSvg({
  width,
  axes,
  series,
  title,
  desc,
}: RadarChartProps & { width: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const tip = useChartTooltip();
  const n = axes.length;
  // The card's width, not the viewport's: the docked panel narrows the card at the same window size.
  const short = width < SHORT_LABEL_BELOW;
  const geometry = useMemo<Geometry>(
    () => ({ cx: width / 2, cy: HEIGHT / 2, radius: fitRadius(width, axes, short), n }),
    [width, axes, n, short],
  );
  const point = useCallback((axis: number, r: number) => pointAt(geometry, axis, r), [geometry]);

  const vertices = useMemo(
    () => series.flatMap((s, si) => s.values.flatMap((v, a) => (v === null ? [] : [{ si, a }]))),
    [series],
  );

  const showFor = (index: number, left: number, top: number) => {
    const v = vertices[index];
    const s = v && series[v.si];
    if (!s) return;
    tip.show(
      { title: s.name, rows: axes.map((label, i) => ({ label, value: s.raw[i]! })) },
      left,
      top,
    );
  };

  const keyboard = useChartKeyboard({
    count: vertices.length,
    onActivate: () => {},
    onMove: (i) => dotRefs.current[i]?.focus(),
  });

  function onFocus(index: number, e: FocusEvent<SVGCircleElement>) {
    keyboard.setActiveIndex(index);
    const wrap = wrapRef.current?.getBoundingClientRect();
    const box = e.currentTarget.getBoundingClientRect();
    if (wrap) showFor(index, box.left - wrap.left + box.width / 2, box.top - wrap.top);
  }

  function onMouse(index: number, e: MouseEvent<SVGCircleElement>) {
    const wrap = wrapRef.current?.getBoundingClientRect();
    const box = e.currentTarget.getBoundingClientRect();
    if (wrap) showFor(index, box.left - wrap.left + box.width / 2, box.top - wrap.top);
  }

  return (
    <div ref={wrapRef} className="relative" style={{ width, height: HEIGHT }}>
      <Frame width={width} height={HEIGHT} title={title} desc={desc} role="group">
        <RadarMarks axes={axes} series={series} geometry={geometry} short={short} />
        {vertices.map(({ si, a }, index) => {
          const s = series[si]!;
          const [x, y] = point(a, s.values[a]!);
          return (
            <circle
              key={`${s.id}-${a}`}
              ref={(el) => {
                dotRefs.current[index] = el;
              }}
              role="img"
              tabIndex={index === keyboard.activeIndex ? 0 : -1}
              aria-label={`${s.name}, ${axes[a]}: ${s.raw[a]}`}
              cx={x}
              cy={y}
              r={4}
              fill={`var(${s.color})`}
              stroke="var(--surface)"
              strokeWidth={1}
              onMouseEnter={(e) => onMouse(index, e)}
              onMouseLeave={tip.hide}
              onFocus={(e) => onFocus(index, e)}
              onBlur={tip.hide}
              onKeyDown={(e) => keyboard.onKeyDown(e, index)}
            />
          );
        })}
      </Frame>
      {tip.open && tip.content ? (
        <ChartTooltip {...tip.content} left={tip.left} top={tip.top} />
      ) : null}
    </div>
  );
});

/** Five-axis radar (design-system 6.10 pattern). Arrow keys walk the vertices, one tab stop. */
export function RadarChart(props: RadarChartProps) {
  return (
    <ParentSize debounceTime={50} parentSizeStyles={{ width: "100%", height: HEIGHT }}>
      {({ width }) =>
        width > 0 ? (
          <PanelMotion width={width} height={HEIGHT} mode="hold">
            {(size) => <RadarSvg {...props} width={size.width} />}
          </PanelMotion>
        ) : null
      }
    </ParentSize>
  );
}

/** Short column heads for a narrow table, by axis position (the five axes are fixed). */
const SHORT_HEADS = ["Attain", "Growth", "Share", "MoM", "Units"] as const;

/** One row per series with the raw values, one column per axis. */
export function RadarChartTable({
  caption,
  rowLabel = "Market",
  axes,
  series,
}: {
  caption: string;
  rowLabel?: string;
  axes: readonly string[];
  series: readonly RadarSeries[];
}) {
  return (
    // Under 40 rem of card the heads shorten so five numeric columns fit without scrolling sideways. The full name
    // stays in the accessible name.
    <div className="@container">
      <ScrollTable scrollLabel={`${caption}, scrollable`}>
        <TableCaption className="sr-only">{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" data-pin="start" className={PIN_HEAD_TINTED_CLASS}>
              {rowLabel}
            </TableHead>
            {axes.map((a, i) => {
              const short = axes.length === SHORT_HEADS.length ? SHORT_HEADS[i] : undefined;
              return (
                <TableHead key={a} scope="col" className="text-right num">
                  <span className={short ? "@max-[40rem]:sr-only" : undefined}>{a}</span>
                  {short ? (
                    <span aria-hidden className="hidden @max-[40rem]:inline">
                      {short}
                    </span>
                  ) : null}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {series.map((s) => (
            <TableRow key={s.id}>
              <TableCell data-pin="start" className={cn(PIN_CELL_CLASS, "font-medium")}>
                {s.name}
              </TableCell>
              {s.raw.map((v, i) => (
                <TableCell key={i} className="text-right num">
                  {v}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </ScrollTable>
    </div>
  );
}
