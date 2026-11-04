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

import type { ResolvedTarget } from "@/domain";
import { useFollowed, useLatestAnswer } from "@/features/assistant/AnswerStore";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { cssMs, onScrollIntent, prefersReducedMotion } from "@/lib/motion";
import { landingWidget, type LandingWidget } from "./landingWidget";

export type Landing = {
  /** The ring and tint are showing (they fade in, hold, fade out; see globals.css). */
  active: boolean;
  target: ResolvedTarget | undefined;
  /** The one widget this citation lands on: only it rings and registers as the scroll target. */
  widget: LandingWidget | undefined;
  /** The widget the page scrolls to for this landing. Set from a ref callback or an effect. */
  register: (el: HTMLElement | null) => void;
};

const NONE: Landing = { active: false, target: undefined, widget: undefined, register: () => {} };
const LandingContext = createContext<Landing>(NONE);

/** Layout has to be this still before the page scrolls: lazy widgets swap in for their skeletons. */
const QUIET_MS = 120;
/** A page that never goes quiet (a stream, a ticking live widget) does not hold the scroll back longer than this. */
const MAX_WAIT_MS = 800;
/** With no widget to scroll to, the ring still shows for the landing's target after this long. */
const NO_TARGET_MS = 1500;
/** Ends the wait for `scrollend`, which a scroll with nowhere to go never fires. A smooth scroll to the chart takes about 450 ms, so 350 would cut it off. */
const SCROLL_END_FALLBACK_MS = 750;

/**
 * Owns one landing at a time (motion-spec.md section 3, rows 3 and 4): when a followed chip's answer is the latest and
 * finished, wait for the page to stop moving, scroll the registered widget into view once, wait for the scroll to
 * end, then show the ring for --hold-highlight. One timer, so the widgets that share the landing (chart, tooltip,
 * grid) never drift apart. The reader scrolling cancels the scroll, never the ring.
 *
 * `cite` in the URL indexes the chips of the answer that was followed, so a landing needs that answer to still be
 * the latest: a later question never re-lands an earlier chip. Each follow is its own landing (`n`).
 */
export function LandingProvider({ children }: { children: ReactNode }) {
  const { ctx } = useConsoleContext();
  const latest = useLatestAnswer();
  const { followed } = useFollowed();
  const resolution =
    ctx.cite !== undefined && latest?.status === "done" && followed?.answerId === latest.id
      ? latest.citations[ctx.cite]?.resolution
      : undefined;
  const target = resolution?.ok ? resolution.target : undefined;
  const widget = target ? landingWidget(target) : undefined;
  const key = target && followed ? `${followed.answerId}:${followed.n}:${ctx.cite}` : undefined;

  const [element, register] = useState<HTMLElement | null>(null);
  // The key whose ring is showing; the hold timer clears it.
  const [shownKey, setShownKey] = useState<string | null>(null);
  // The key already handled, so a widget remounting during the hold does not land it twice.
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!key || handled.current === key) return;
    const abort = new AbortController();
    const { signal } = abort;
    let phase: "settle" | "scroll" | "shown" = "settle";
    const timers: ReturnType<typeof setTimeout>[] = [];
    let frame = 0;
    signal.addEventListener("abort", () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(frame);
    });
    const later = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms));

    const show = () => {
      if (phase === "shown") return;
      phase = "shown";
      handled.current = key;
      abort.abort();
      setShownKey(key);
    };
    onScrollIntent(show, signal);

    if (!element) {
      later(show, NO_TARGET_MS);
      return () => abort.abort();
    }

    const go = () => {
      phase = "scroll";
      observer.disconnect();
      // Two frames after the last change, so the scroll measures settled layout.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (phase !== "scroll") return;
          const smooth = !prefersReducedMotion();
          void import("./landingScroll").then(
            ({ scrollToCentre }) => {
              if (phase !== "scroll" || signal.aborted) return;
              scrollToCentre(element, smooth);
              if (!smooth) return show();
              window.addEventListener("scrollend", show, { once: true, signal });
              later(show, SCROLL_END_FALLBACK_MS);
            },
            // The chunk failed to load (offline): ring the widget where it is rather than not at all.
            () => {
              if (phase === "scroll" && !signal.aborted) show();
            },
          );
        });
      });
    };
    const started = performance.now();
    const settle = () => {
      timers.forEach(clearTimeout);
      later(go, Math.max(0, Math.min(QUIET_MS, MAX_WAIT_MS - (performance.now() - started))));
    };
    const observer = new ResizeObserver(settle);
    signal.addEventListener("abort", () => observer.disconnect());
    observer.observe(document.body);
    settle();
    return () => abort.abort();
  }, [key, element]);

  useEffect(() => {
    if (!shownKey) return;
    const hold = setTimeout(
      () => setShownKey(null),
      cssMs("--dur-land-in", 240) + cssMs("--hold-highlight", 1500),
    );
    return () => clearTimeout(hold);
  }, [shownKey]);

  const active = key !== undefined && shownKey === key;
  const registerElement = useCallback((el: HTMLElement | null) => register(el), []);
  const value = useMemo(
    () => ({ active, target, widget, register: registerElement }),
    [active, target, widget, registerElement],
  );
  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

export function useLanding(): Landing {
  return useContext(LandingContext);
}

/**
 * A callback ref for a widget that can be a landing's target. It registers the element only while this widget is
 * the one the citation names, so the page never scrolls to (or rings) a second widget.
 */
export function useLandingRef(widget: LandingWidget) {
  const { widget: landed, register } = useLanding();
  const match = landed === widget;
  return useCallback(
    (el: HTMLElement | null) => {
      if (match) register(el);
    },
    [match, register],
  );
}

/** True while the ring shows on `widget`: the citation names it and the landing is active. */
export function useIsLanded(widget: LandingWidget) {
  const { active, widget: landed } = useLanding();
  return active && landed === widget;
}
