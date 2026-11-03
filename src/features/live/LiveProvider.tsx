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
import type { LiveEngine } from "./engine";

/** How long marks keep their tween after a tick lands (a little over --dur-chart). */
const TWEEN_SETTLE_MS = 300;

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

/** Live state for tests and stories that drive the tick themselves. */
export function LiveStateProvider({ value, children }: { value: LiveState; children: ReactNode }) {
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

/**
 * Holds live mode for the page. The data engine loads on first activation. A reload returns to the saved
 * data: nothing here is persisted or written to the URL. The timer is cleared on pause and on unmount, and
 * skips ticks while the tab is hidden.
 */
export function LiveProvider({ children }: { children: ReactNode }) {
  const [live, setLiveState] = useState(false);
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tweening, setTweening] = useState(false);
  const [engine, setEngine] = useState<LiveEngine | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setLive = useCallback((on: boolean) => {
    setLiveState(on);
    if (on) setUpdatedAt(new Date());
  }, []);

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
    if (!live || !engine) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setTick((t) => t + 1);
      setUpdatedAt(new Date());
      setTweening(true);
      clearTimeout(settle.current);
      settle.current = setTimeout(() => setTweening(false), TWEEN_SETTLE_MS);
    }, LIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [live, engine]);

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

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
const SAVED_LABEL = /Source · data\.json|Derived · sum of series/g;

/** Provenance captions say where a figure came from; once the figures move they read `Derived · live`. */
function relabel<T>(value: T): T {
  const walk = (v: Json): Json => {
    if (typeof v === "string") return v.replace(SAVED_LABEL, "Derived · live");
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return walk(value as Json) as T;
}

/**
 * A widget's view model: the one the server sent, or while live a fresh one computed in the browser with the
 * same function over the drifted dataset. `select` must be a module-level function so it is stable.
 */
export function useLiveVM<T>(
  initial: T,
  select: (engine: LiveEngine, ds: Dataset, ctx: Context) => T,
): T {
  const { engine, dataset } = useLiveState();
  const { ctx } = useConsoleContext();
  return useMemo(() => {
    if (!engine || !dataset) return initial;
    const next = select(engine, dataset, ctx);
    return ctx.period === dataset.meta.latestPeriod ? relabel(next) : next;
  }, [engine, dataset, ctx, initial, select]);
}
