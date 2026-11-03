"use client";

import { ParentSize } from "@visx/responsive";
import { useRef, type FocusEvent, type MouseEvent } from "react";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatOneDecimal } from "@/lib/format";
import { ChartTooltip, useChartTooltip } from "./ChartTooltip";
import { Frame } from "./Frame";
import { Legend } from "./Legend";
import { useChartKeyboard } from "./useChartKeyboard";

export type RadarSeries = {
  id: string;
  name: string;
  /** A CSS custom property such as `--cat-1`. */
  color: string;
  /** Normalised 0..1 per axis. */
  values: readonly number[];
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

/** Long axis names break at the space nearest the middle so side labels stay inside the card. */
function splitLabel(label: string): string[] {
  if (label.length <= 12 || !label.includes(" ")) return [label];
  const mid = label.length / 2;
  let best = -1;
  for (let i = 0; i < label.length; i++) {
    if (label[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return [label.slice(0, best), label.slice(best + 1)];
}
const RINGS = [0.5, 1];
/** Clockwise from the top, one angle per axis. */
const angleOf = (axis: number, count: number) => ((-90 + (360 / count) * axis) * Math.PI) / 180;

function RadarSvg({ width, axes, series, title, desc }: RadarChartProps & { width: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const tip = useChartTooltip();
  const cx = width / 2;
  const cy = HEIGHT / 2;
  const radius = Math.max(Math.min(120, (width - 200) / 2), 80);
  const n = axes.length;

  const point = (axis: number, r: number): [number, number] => [
    cx + Math.cos(angleOf(axis, n)) * radius * r,
    cy + Math.sin(angleOf(axis, n)) * radius * r,
  ];
  const poly = (rs: readonly number[]) =>
    rs
      .map((r, a) => point(a, r))
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ") + " Z";

  const vertices = series.flatMap((s, si) => s.values.map((_, a) => ({ si, a })));

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

  const hasSelection = series.some((s) => s.selected);

  return (
    <div ref={wrapRef} className="relative" style={{ width, height: HEIGHT }}>
      <Frame width={width} height={HEIGHT} title={title} desc={desc} role="group">
        {RINGS.map((r) => (
          <g key={r}>
            <path d={poly(axes.map(() => r))} fill="none" stroke="var(--grid)" strokeWidth={1} />
            <text
              x={cx + 4}
              y={cy - radius * r}
              dy="-0.2em"
              aria-hidden
              className="fill-ink-muted text-[length:var(--text-caption)]"
            >
              {formatOneDecimal(r)}
            </text>
          </g>
        ))}
        {axes.map((label, a) => {
          const [x, y] = point(a, 1);
          const [lx, ly] = point(a, 1.18);
          const cos = Math.cos(angleOf(a, n));
          const sin = Math.sin(angleOf(a, n));
          const anchor = Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end";
          const lines = splitLabel(label);
          const extra = (lines.length - 1) * 1.1;
          // Top labels grow upwards, bottom labels downwards, side labels stay centred on the axis.
          const dy =
            sin < -0.5 ? `${-0.2 - extra}em` : sin > 0.5 ? "0.9em" : `${0.32 - extra / 2}em`;
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
        {series.map((s) => {
          const emphasised = s.selected || !hasSelection;
          return (
            <path
              key={s.id}
              data-series={s.id}
              d={poly(s.values)}
              fill={`var(${s.color})`}
              fillOpacity={s.selected ? 0.2 : 0.12}
              stroke={`var(${s.color})`}
              strokeWidth={s.selected ? 3 : 2}
              strokeOpacity={emphasised ? 1 : 0.55}
              strokeLinejoin="round"
            />
          );
        })}
        {vertices.map(({ si, a }, index) => {
          const s = series[si]!;
          const [x, y] = point(a, s.values[a] ?? 0);
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
}

/** Five-axis radar (design-system 6.10 pattern). Arrow keys walk the vertices, one tab stop. */
export function RadarChart(props: RadarChartProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <ParentSize debounceTime={50} parentSizeStyles={{ width: "100%", height: HEIGHT }}>
        {({ width }) => (width > 0 ? <RadarSvg {...props} width={width} /> : null)}
      </ParentSize>
      <Legend
        label="Radar series"
        items={props.series.map((s) => ({ label: s.name, swatch: "line-solid", color: s.color }))}
      />
    </div>
  );
}

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
    <Table scrollLabel={`${caption}, scrollable`}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{rowLabel}</TableHead>
          {axes.map((a) => (
            <TableHead key={a} scope="col" className="text-right">
              {a}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {series.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.name}</TableCell>
            {s.raw.map((v, i) => (
              <TableCell key={i} className="text-right num">
                {v}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
