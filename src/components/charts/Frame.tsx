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
   * Charts whose marks are focusable buttons use role="group": axe forbids interactive
   * descendants inside role={interactive ? "group" : "img"}. Static charts keep role={interactive ? "group" : "img"}.
   */
  interactive?: boolean;
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
  interactive = false,
  children,
}: FrameProps) {
  const titleId = useId();
  const descId = useId();
  return (
    <svg
      role={interactive ? "group" : "img"}
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
