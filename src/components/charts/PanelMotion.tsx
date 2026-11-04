"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

/*
 * Whether the assistant column is moving (ShellGrid sets it). Charts hold their size while it is true, so they
 * re-render once, at the end, instead of on each frame. It stays true for a beat after the move so the final
 * width has been measured (visx's ParentSize debounces by 50 ms) before the chart is released.
 */
const RELEASE_MS = 90;
let frozenNow = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (frozenNow === next) return;
  frozenNow = next;
  listeners.forEach((l) => l());
}

export function setPanelMoving(moving: boolean) {
  clearTimeout(timer);
  if (moving) set(true);
  else timer = setTimeout(() => set(false), RELEASE_MS);
}

// Module-level, so React keeps one subscription per chart instead of re-subscribing on every render.
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/**
 * Wraps a chart's ParentSize render: the live size at rest, the size it had when the move began during one.
 *
 * "stretch" is for a chart whose x axis is a linear scale (the line chart): its plot SVG stretches horizontally
 * only, see `[data-frozen="stretch"]` in globals.css. "hold" is for a chart whose shape carries meaning (radar,
 * map): it keeps the size it had, centred, and the card crops it symmetrically (`[data-frozen="hold"]`).
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
  const frozen = useSyncExternalStore(
    subscribe,
    () => frozenNow,
    () => false,
  );
  const [rest, setRest] = useState({ width, height });
  if (!frozen && (rest.width !== width || rest.height !== height)) setRest({ width, height });
  return (
    <div data-frozen={frozen ? mode : undefined}>{children(frozen ? rest : { width, height })}</div>
  );
}
