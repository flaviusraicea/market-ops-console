import { useState, useSyncExternalStore } from "react";

/**
 * Whether the assistant column is moving. Charts hold their width while it is true, so they re-render once, at
 * the end, instead of on each frame. It stays true for a beat after the move so the final width has been measured
 * (visx's ParentSize debounces by 50 ms) before the chart is released.
 */
const RELEASE_MS = 90;
let frozen = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function set(next: boolean) {
  if (frozen === next) return;
  frozen = next;
  listeners.forEach((l) => l());
}

export function setPanelMoving(moving: boolean) {
  clearTimeout(timer);
  if (moving) set(true);
  else timer = setTimeout(() => set(false), RELEASE_MS);
}

export function usePanelFrozen() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => frozen,
    () => false,
  );
}

/** The size a chart should render at: the live size at rest, the size it had when the move began during one. */
export function useRestSize(width: number, height: number) {
  const frozen = usePanelFrozen();
  const [rest, setRest] = useState({ width, height });
  if (!frozen && (rest.width !== width || rest.height !== height)) setRest({ width, height });
  return { size: frozen ? rest : { width, height }, frozen };
}
