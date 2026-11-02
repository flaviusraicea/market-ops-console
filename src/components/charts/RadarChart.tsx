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
  values: readonly [number, number, number];
  /** Formatted raw values, in axis order. */
  raw: readonly [string, string, string];
  selected?: boolean;
};

type RadarChartProps = {
  axes: readonly [string, string, string];
  series: readonly RadarSeries[];
  title: string;
  desc: string;
};

const HEIGHT = 300;
const RINGS = [0.25, 0.5, 0.75, 1];
const ANGLES = [-90, 30, 150].map((d) => (d * Math.PI) / 180);

function RadarSvg({ width, axes, series, title, desc }: RadarChartProps & { width: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const tip = useChartTooltip();
  const cx = width / 2;
  const cy = 156;
  const radius = Math.min(100, Math.max((width - 220) / 2, 56));

  const point = (axis: number, r: number): [number, number] => [
    cx + Math.cos(ANGLES[axis]!) * radius * r,
    cy + Math.sin(ANGLES[axis]!) * radius * r,
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
          <path key={r} d={poly([r, r, r])} fill="none" stroke="var(--grid)" strokeWidth={1} />
        ))}
        {axes.map((label, a) => {
          const [x, y] = point(a, 1);
          const [lx, ly] = point(a, 1.18);
          const anchor = a === 0 ? "middle" : a === 1 ? "start" : "end";
          return (
            <g key={label}>
              <line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--grid)" strokeWidth={1} />
              <text
                x={lx}
                y={ly}
                dy={a === 0 ? "-0.2em" : "0.9em"}
                textAnchor={anchor}
                className="fill-ink-2 text-[length:var(--text-label)] font-medium"
              >
                {label}
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

/** Three-axis radar (design-system 6.10 pattern). Arrow keys walk the vertices, one tab stop. */
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

/** One row per series with the three raw values. */
export function RadarChartTable({
  caption,
  rowLabel = "Market",
  axes,
  series,
}: {
  caption: string;
  rowLabel?: string;
  axes: readonly [string, string, string];
  series: readonly RadarSeries[];
}) {
  return (
    <Table>
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
              <TableCell key={i} className="text-right tabular-nums">
                {v}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
