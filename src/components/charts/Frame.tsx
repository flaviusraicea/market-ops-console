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
   * description still apply through aria-labelledby and aria-describedby.
   */
  role?: "img" | "group";
  /** Rendered inside the plot-area group, already translated by the margins. */
  children: ReactNode;
};

const NO_MARGIN: Margins = { top: 0, right: 0, bottom: 0, left: 0 };

/** The accessible SVG shell every chart shares. Width comes from ParentSize; height is fixed per chart. */
export function Frame({
  width,
  height,
  title,
  desc,
  margin = NO_MARGIN,
  role = "img",
  children,
}: FrameProps) {
  const titleId = useId();
  const descId = useId();
  return (
    <svg
      role={role}
      aria-labelledby={titleId}
      aria-describedby={descId}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="block"
    >
      <title id={titleId}>{title}</title>
      <desc id={descId}>{desc}</desc>
      <g transform={`translate(${margin.left},${margin.top})`}>{children}</g>
    </svg>
  );
}
