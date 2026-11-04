"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Context, Dataset } from "@/domain";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { LIVE_INTERVAL_MS } from "@/lib/live";
import { TWEEN_SETTLE_MS } from "@/lib/motion";
import type { LiveEngine } from "./engine";

export type LiveState = {
  /** The timer is running. */
  live: boolean;
  /** Ticks applied so far. 0 is the saved data; it stays where it was when paused. */
  tick: number;
  /** When the last tick landed, or when Live was turned on. */
  updatedAt: Date | null;
  /** True for a moment after each tick, so DashboardColumn lets the marks tween. */
  tweening: boolean;
  /** The saved data with the simulated drift applied; null until the first tick. */
  dataset: Dataset | null;
  engine: LiveEngine | null;
  setLive: (on: boolean) => void;
};

const INERT: LiveState = {
  live: false,
  tick: 0,
  updatedAt: null,
  tweening: false,
  dataset: null,
  engine: null,
  setLive: () => {},
};

const LiveContext = createContext<LiveState>(INERT);

/**
 * Holds live mode for the page. The data engine loads on first activation. A reload returns to the saved
 * data: nothing here is persisted or written to the URL. The timer is cleared on pause and on unmount, and
 * skips ticks while the tab is hidden. Pass `tick` to hold the tick yourself (stories and tests): Live is then
 * on, the engine loads, and there is no timer.
 */
export function LiveProvider({
  tick: controlled,
  children,
}: {
  tick?: number;
  children: ReactNode;
}) {
  const [liveState, setLiveState] = useState(false);
  const [ticked, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tweening, setTweening] = useState(false);
  const [engine, setEngine] = useState<LiveEngine | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isControlled = controlled !== undefined;
  const live = liveState || isControlled;
  const tick = controlled ?? ticked;

  const setLive = useCallback(
    (on: boolean) => {
      // Pressing Live while it is already on changes nothing, so the stamp keeps its time.
      if (on === live) return;
      setLiveState(on);
      if (on) setUpdatedAt(new Date());
    },
    [live],
  );

  useEffect(() => {
    if (!live || engine) return;
    let cancelled = false;
    void import("./engine").then((m) => {
      if (!cancelled) setEngine(m.engine);
    });
    return () => {
      cancelled = true;
    };
  }, [live, engine]);

  useEffect(() => {
    if (!live || !engine || isControlled) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setTick((t) => t + 1);
      setUpdatedAt(new Date());
      setTweening(true);
      clearTimeout(settle.current);
      settle.current = setTimeout(() => setTweening(false), TWEEN_SETTLE_MS);
    }, LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [live, engine, isControlled]);

  useEffect(() => () => clearTimeout(settle.current), []);

  const dataset = useMemo(
    () => (engine && tick > 0 ? engine.overlay(engine.full, tick) : null),
    [engine, tick],
  );
  const value = useMemo<LiveState>(
    () => ({ live, tick, updatedAt, tweening, dataset, engine, setLive }),
    [live, tick, updatedAt, tweening, dataset, engine, setLive],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLiveState(): LiveState {
  return useContext(LiveContext);
}

/** True while simulated figures are on screen: Live is running, or paused after at least one tick. */
export function isSimulated(s: Pick<LiveState, "live" | "tick">): boolean {
  return s.live || s.tick > 0;
}

/**
 * A widget's view model: the one the server sent, or while live a fresh one computed in the browser with the
 * same function over the drifted dataset. `select` must be a module-level function so it is stable.
 */
export function useLiveVM<T>(
  initial: T,
  select: (engine: LiveEngine, ds: Dataset, ctx: Context) => T,
  /** A chart that draws every month, the latest included, keeps ticking when an earlier month is selected. */
  options?: { spansLatest?: boolean },
): T {
  const { engine, dataset } = useLiveState();
  const { ctx } = useConsoleContext();
  // Only the latest month ticks. Any other selected month keeps the server's model, so history is never revised.
  const ticking =
    engine !== null &&
    (options?.spansLatest === true || ctx.period === engine.full.meta.latestPeriod);
  return useMemo(
    () => (engine && dataset && ticking ? select(engine, dataset, ctx) : initial),
    [engine, dataset, ticking, ctx, initial, select],
  );
}
