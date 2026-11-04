import { useState, useSyncExternalStore } from "react";

/**
 * Whether the assistant column is moving. Charts hold their size while it is true, so they render once, at the
 * end, instead of on each frame. It stays true for a beat after the move so the final width has been measured
 * (visx's ParentSize debounces by 50 ms) before the chart is released.
 */
let frozen = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

const set = (next: boolean) => {
  frozen = next;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const read = () => frozen;
const server = () => false;

export function setPanelMoving(moving: boolean) {
  clearTimeout(timer);
  if (moving) set(true);
  else timer = setTimeout(set, 90, false);
}

/** The size a chart should render at: the live size at rest, the size it had when the move began during one. */
export function useRestSize(width: number, height: number) {
  const held = useSyncExternalStore(subscribe, read, server);
  const [rest, setRest] = useState({ width, height });
  if (!held && (rest.width !== width || rest.height !== height)) setRest({ width, height });
  return { size: held ? rest : { width, height }, frozen: held };
}
