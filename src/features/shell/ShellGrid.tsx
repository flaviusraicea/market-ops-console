"use client";

import { useEffect, useRef, useState, type TransitionEvent, type ReactNode } from "react";

import { MobileAssistant } from "@/features/assistant/MobileAssistant";
import { useHydrated } from "@/lib/useHydrated";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { ConnectedAssistantRail } from "./AssistantRail";
import { DashboardColumn } from "./DashboardColumn";
import { setPanelMoving } from "@/lib/panelMotion";
import { useAssistantRail } from "./railState";

type Phase = "closed" | "opening" | "open" | "closing";

/** Longest the panel animation can take; a fallback for a browser that drops the transitionend event. */
const SETTLE_MS = 600;
const REDUCED_FADE_MS = 150;

/**
 * The page grid. From 1024 px the assistant is docked beside the dashboard: 320 px wide, 360 px from 1400 px,
 * and a 48 px rail when collapsed. It never covers the dashboard as a modal (at 125% zoom on a 1440 laptop the
 * window is 1152 px, which used to get a modal). Below 1024 px there is no column and no rail: the assistant is
 * a bottom bar that opens a sheet.
 *
 * Open and close animate the column itself: `--panel-w` runs 48 px to the docked width in one CSS transition, so
 * the dashboard and the panel move together. The panel keeps its full width and the column clips it on the left.
 * Charts hold their width during the move and re-render once at the end (lib/panelMotion).
 */
export function ShellGrid({
  dashboard,
  assistant,
}: {
  dashboard: ReactNode;
  assistant: ReactNode;
}) {
  const { open, setLiveHost } = useAssistantRail();
  const mainRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState<Phase>(open ? "open" : "closed");
  // Adjusting state to a prop change during render: the phase starts moving in the same render as `open`.
  const [seen, setSeen] = useState(open);
  if (seen !== open) {
    setSeen(open);
    setPhase(open ? "opening" : "closing");
  }
  const moving = phase === "opening" || phase === "closing";

  const settle = () => setPhase((p) => (p === "opening" ? "open" : p === "closing" ? "closed" : p));
  useEffect(() => {
    if (!moving) return;
    setPanelMoving(true);
    // Reduced motion zeroes the duration, so no transition runs and no event comes; the panel still cross-fades.
    const still = parseFloat(getComputedStyle(mainRef.current!).transitionDuration) === 0;
    const timer = setTimeout(settle, still ? REDUCED_FADE_MS : SETTLE_MS);
    return () => {
      clearTimeout(timer);
      setPanelMoving(false);
    };
  }, [moving]);
  const onTransitionEnd = (e: TransitionEvent<HTMLElement>) => {
    if (e.target === e.currentTarget && e.propertyName === "--panel-w") settle();
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
      ref={mainRef}
      data-docked={docked ? "" : undefined}
      onTransitionEnd={onTransitionEnd}
      className="shell-grid grid grid-cols-[minmax(0,1fr)] gap-[var(--gap)] outline-none lg:grid-cols-[minmax(0,1fr)_var(--panel-w)] [--assistant-top:var(--below-header)]"
    >
      <DashboardColumn>{dashboard}</DashboardColumn>
      {showColumn ? (
        <aside
          aria-labelledby="assistant-h"
          data-panel={phase}
          className="panel-column relative z-20 min-w-0 max-lg:hidden"
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
