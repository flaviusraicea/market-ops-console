"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type ReactNode,
} from "react";

import { cn } from "@/components/cn";
import { MobileAssistant } from "@/features/assistant/MobileAssistant";
import { useHydrated } from "@/lib/useHydrated";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { ConnectedAssistantRail } from "./AssistantRail";
import { DashboardColumn } from "./DashboardColumn";
import { useAssistantRail } from "./railState";

type Phase = "closed" | "opening" | "open" | "closing";

/** Longest the panel animation can take; a fallback for a browser that drops the animationend event. */
const SETTLE_MS = 600;

/**
 * The page grid. From 1024 px the assistant is docked beside the dashboard: 320 px wide, 360 px from 1400 px,
 * and a 48 px rail when collapsed. It never covers the dashboard as a modal (at 125% zoom on a 1440 laptop the
 * window is 1152 px, which used to get a modal). Below 1024 px there is no column and no rail: the assistant is
 * a bottom bar that opens a sheet.
 *
 * Open and close animate the panel only. The column switches at the start of an open and at the end of a close,
 * and while the panel moves the dashboard is held at the width it had, so it reflows once, after the motion,
 * instead of re-measuring every chart on each frame.
 */
export function ShellGrid({
  dashboard,
  assistant,
}: {
  dashboard: ReactNode;
  assistant: ReactNode;
}) {
  const { open, setLiveHost } = useAssistantRail();
  const dashRef = useRef<HTMLDivElement>(null);
  // The dashboard's width at rest, kept current by a ResizeObserver, so a move can hold it there.
  const restWidth = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");
  // Adjusting state to a prop change during render: the phase starts moving in the same render as `open`.
  const [seen, setSeen] = useState(open);
  if (seen !== open) {
    setSeen(open);
    setPhase(open ? "opening" : "closing");
  }
  const moving = phase === "opening" || phase === "closing";

  useEffect(() => {
    const el = dashRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (!el.style.width) restWidth.current = el.offsetWidth;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Before the first frame of a move, hold the dashboard at its resting width; release it when the move ends.
  useLayoutEffect(() => {
    const el = dashRef.current;
    if (!el) return;
    if (moving && restWidth.current) el.style.width = `${restWidth.current}px`;
    else el.style.width = "";
  }, [moving]);

  const settle = () => setPhase((p) => (p === "opening" ? "open" : p === "closing" ? "closed" : p));
  useEffect(() => {
    if (!moving) return;
    const timer = setTimeout(settle, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [moving]);
  const onAnimationEnd = (e: AnimationEvent<HTMLElement>) => {
    // The slide (or, with reduced motion, the cross-fade) on the panel itself; its children animate too.
    if ((e.target as HTMLElement).id !== "assistant-panel") return;
    if (phase === "opening" && e.animationName === "panel-fade-in") return;
    if (moving) settle();
  };
  const docked = phase !== "closed";
  // The server cannot know the viewport, so it sends both: the column is hidden by CSS below 1024 px and the bar
  // above it. Once hydrated, only the one that applies stays mounted.
  const hydrated = useHydrated();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const showColumn = !hydrated || desktop;
  const showSheet = !hydrated || !desktop;
  return (
    <main
      id="main"
      tabIndex={-1}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)] outline-none gap-[var(--gap)] lg:grid-cols-[minmax(0,1fr)_48px]",
        // The header is pinned in both modes, so the assistant sticks below it.
        "[--assistant-top:var(--below-header)]",
        docked && "lg:grid-cols-[minmax(0,1fr)_var(--assistant-w)]",
        // While the dashboard is held at its old width it may run under the panel; it must not scroll the page.
        moving && "overflow-x-clip",
      )}
    >
      <DashboardColumn>
        <div ref={dashRef}>{dashboard}</div>
      </DashboardColumn>
      {showColumn ? (
        <aside
          aria-labelledby="assistant-h"
          data-panel={phase}
          onAnimationEnd={onAnimationEnd}
          className="relative z-20 min-w-0 max-lg:hidden"
        >
          <ConnectedAssistantRail />
          {assistant}
        </aside>
      ) : null}
      {showSheet ? <MobileAssistant panel={assistant} /> : null}
      {/* Always mounted, so "Answer complete" is announced while the panel is collapsed or the sheet is closed. */}
      <div ref={setLiveHost} role="status" aria-live="polite" className="sr-only" />
    </main>
  );
}
