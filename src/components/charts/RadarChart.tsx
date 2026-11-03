"use client";

import { ParentSize } from "@visx/responsive";
import { useCallback, useMemo, useRef, type FocusEvent, type MouseEvent } from "react";

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
import { RadarMarks, pointAt, type Geometry } from "./RadarMarks";
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

function RadarSvg({ width, axes, series, title, desc }: RadarChartProps & { width: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const tip = useChartTooltip();
  const n = axes.length;
  const geometry = useMemo<Geometry>(
    () => ({
      cx: width / 2,
      cy: HEIGHT / 2,
      radius: Math.max(Math.min(120, (width - 200) / 2), 80),
      n,
    }),
    [width, n],
  );
  const point = useCallback((axis: number, r: number) => pointAt(geometry, axis, r), [geometry]);

  const vertices = useMemo(
    () => series.flatMap((s, si) => s.values.map((_, a) => ({ si, a }))),
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
        <RadarMarks axes={axes} series={series} geometry={geometry} />
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
