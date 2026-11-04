"use client";

import type { ReactNode } from "react";

import { useRestSize } from "@/lib/panelMotion";

/**
 * Wraps a chart's ParentSize render so the chart does not re-render while the assistant column moves
 * (lib/panelMotion), then renders once at the final size.
 *
 * "stretch" is for a chart whose x axis is a linear scale (the line chart): its plot SVG stretches horizontally
 * only, see `[data-frozen="stretch"]` in globals.css. "hold" is for a chart whose shape carries meaning (radar,
 * map): it keeps the size it had, centred, and the card crops it symmetrically.
 */
export function PanelMotion({
  width,
  height,
  mode,
  children,
}: {
  width: number;
  height: number;
  mode: "stretch" | "hold";
  children: (size: { width: number; height: number }) => ReactNode;
}) {
  const { size, frozen } = useRestSize(width, height);
  return (
    <div
      data-frozen={frozen ? mode : undefined}
      className={frozen && mode === "hold" ? "flex justify-center overflow-clip" : undefined}
      style={frozen && mode === "hold" ? { height: size.height } : undefined}
    >
      {children(size)}
    </div>
  );
}
