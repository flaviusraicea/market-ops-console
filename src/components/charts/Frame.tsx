"use client";

import { useId, type ReactNode } from "react";

export type Margins = { top: number; right: number; bottom: number; left: number };

type FrameProps = {
  width: number;
  height: number;
  title: string;
  desc: string;
  margin?: Margins;
  /**
   * "img" for static charts. A chart with focusable marks passes "group", because an img
   * may not contain interactive descendants (axe nested-interactive). The title and
   * description still apply through aria-label and aria-describedby.
   */
  role?: "img" | "group";
  /** Rendered inside the plot-area group, already translated by the margins. */
  children: ReactNode;
};

const NO_MARGIN: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * The accessible SVG shell every chart shares. Width comes from ParentSize; height is fixed per chart.
 * The name is an aria-label, not a <title> child: a <title> also paints as the browser's native hover tooltip
 * over the whole chart, which fights the chart's own tooltip.
 */
export function Frame({
  width,
  height,
  title,
  desc,
  margin = NO_MARGIN,
  role = "img",
  children,
}: FrameProps) {
  const descId = useId();
  return (
    <svg
      role={role}
      aria-label={title}
      aria-describedby={descId}
      viewBox={`0 0 ${width} ${height}`}
      // Only matters while the assistant column moves and the plot stretches (globals.css); at rest the box matches.
      preserveAspectRatio="none"
      data-plot
      width={width}
      height={height}
      className="block"
    >
      <desc id={descId}>{desc}</desc>
      <g transform={`translate(${margin.left},${margin.top})`}>{children}</g>
    </svg>
  );
}
