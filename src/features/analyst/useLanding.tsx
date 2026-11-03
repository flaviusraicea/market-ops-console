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
import { prefersReducedMotion } from "@/lib/motion";

export type Landing = {
  /** The ring and tint are showing (they fade in, hold, fade out; see globals.css). */
  active: boolean;
  target: ResolvedTarget | undefined;
  /** The widget the page scrolls to for this landing registers its element here; returns the unregister. */
  register: (el: HTMLElement | null) => () => void;
};

const NONE: Landing = { active: false, target: undefined, register: () => () => {} };
const LandingContext = createContext<Landing>(NONE);

const QUIET_MS = 120;
const WAIT_FOR_TARGET_MS = 1500;
/** A page that never goes quiet (a stream, a ticking live widget) does not hold the scroll back for more than this. */
const MAX_WAIT_MS = 800;
const SCROLL_FALLBACK_MS = 350;
const USER_INPUT = ["wheel", "touchstart", "keydown"] as const;

/** A time custom property in ms. The CSS minifier rewrites "2000ms" as "2s" and "150ms" as ".15s". */
const cssMs = (name: string, fallback: number) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : fallback;
};

/**
 * Owns one landing at a time (motion-spec.md section 3, rows 3 and 4): when a followed chip's answer is the latest and
 * finished, wait for the page to stop moving (lazy widgets swap in for their skeletons), scroll the registered widget
 * into view once, wait for the scroll to end, then show the ring for --hold-highlight and drop it. One timer, so the
 * widgets that share the landing (chart, tooltip, grid) never drift apart. The reader's wheel, touch or keys cancel
 * the scroll, never the ring.
 *
 * `cite` in the URL indexes the chips of the answer that was followed, so a landing needs that answer to still be
 * the latest: a later question never re-lands an earlier chip.
 */
export function LandingProvider({ children }: { children: ReactNode }) {
  const { ctx } = useConsoleContext();
  const latest = useLatestAnswer();
  const { followed } = useFollowed();
  const resolution =
    ctx.cite !== undefined &&
    latest?.status === "done" &&
    followed?.answerId === latest.id &&
    followed.index === ctx.cite
      ? latest.citations[ctx.cite]?.resolution
      : undefined;
  const target = resolution?.ok ? resolution.target : undefined;
  const key = target && latest ? `${latest.id}:${ctx.cite}:${target.period}` : undefined;

  const element = useRef<HTMLElement | null>(null);
  const register = useCallback((el: HTMLElement | null) => {
    element.current = el;
    return () => {
      if (element.current === el) element.current = null;
    };
  }, []);

  // The key whose ring is showing, and the key whose landing is over.
  const [shown, setShown] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  useEffect(() => {
    if (!key) return;
    let scrolling = true;
    let quiet: ReturnType<typeof setTimeout> | undefined;
    let hold: ReturnType<typeof setTimeout> | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    const started = performance.now();

    let shownOnce = false;
    const show = () => {
      if (shownOnce) return;
      shownOnce = true;
      cleanupScroll();
      setShown(key);
      hold = setTimeout(
        () => setOver(key),
        cssMs("--dur-land-in", 150) + cssMs("--hold-highlight", 2000),
      );
    };
    const onScrollEnd = () => show();
    const cancelScroll = () => {
      if (!scrolling) return;
      scrolling = false;
      cleanupScroll();
      show();
    };
    function cleanupScroll() {
      scrolling = false;
      observer.disconnect();
      clearTimeout(quiet);
      clearTimeout(fallback);
      cancelAnimationFrame(frame);
      window.removeEventListener("scrollend", onScrollEnd);
      for (const type of USER_INPUT) window.removeEventListener(type, cancelScroll);
    }
    let went = false;
    const go = () => {
      if (went) return;
      const el = element.current;
      if (!el && performance.now() - started < WAIT_FOR_TARGET_MS) {
        quiet = setTimeout(go, 100);
        return;
      }
      went = true;
      observer.disconnect();
      // Two frames after the last change, so the scroll measures settled layout.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!scrolling) return;
          if (!el) return show();
          const smooth = !prefersReducedMotion();
          window.addEventListener("scrollend", onScrollEnd, { once: true });
          // A scroll that has nowhere to go never fires scrollend: the fallback ends the wait.
          fallback = setTimeout(show, smooth ? SCROLL_FALLBACK_MS + 400 : 50);
          el.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
          if (!smooth) show();
        });
      });
    };
    function settle() {
      clearTimeout(quiet);
      const left = MAX_WAIT_MS - (performance.now() - started);
      quiet = setTimeout(go, Math.max(0, Math.min(QUIET_MS, left)));
    }
    const observer = new ResizeObserver(settle);
    observer.observe(document.body);
    for (const type of USER_INPUT) window.addEventListener(type, cancelScroll, { passive: true });
    settle();
    return () => {
      cleanupScroll();
      clearTimeout(hold);
    };
  }, [key]);

  const active = key !== undefined && shown === key && over !== key;
  const value = useMemo(() => ({ active, target, register }), [active, target, register]);
  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

/** The citation the reader followed and whether its ring is showing. */
export function useLanding(): Landing {
  return useContext(LandingContext);
}

/** Registers the widget a landing scrolls to. */
export function useLandingTarget(ref: { current: HTMLElement | null }) {
  const { register } = useLanding();
  useEffect(() => register(ref.current), [register, ref]);
}
