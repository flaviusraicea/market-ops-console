"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { ArrowDown, ICON_STROKE } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { onScrollIntent, prefersReducedMotion } from "@/lib/motion";
import { AnswerCard } from "./AnswerCardLazy";
import { EmptyState, type PanelContext } from "./EmptyState";
import type { Answer } from "./useAnswerMachine";

type AnswerListProps = {
  answers: readonly Answer[];
  /** What the empty state says about the current view. */
  context: PanelContext;
  onPick: (text: string) => void;
  onStop: (id: string) => void;
  onRetry: (id: string) => void;
  /** A card's "Try" button: fill the composer with a question. */
  onTry: (text: string) => void;
  /** Panel bumps this when the user asks or retries; the list then scrolls the newest card into view. */
  scrollSignal?: number;
};

const NEAR_BOTTOM_PX = 24;
/** How long a smooth scroll to a new card keeps the list following the stream. */
const FOLLOW_MS = 500;

/**
 * The session's answers, newest at the bottom. The panel caps its height (a sticky column from 1024 px, a bottom
 * sheet below), so the list is the only scrolling part. It follows the stream only while the reader is at the bottom.
 */
export function AnswerList({
  answers,
  context,
  onPick,
  onStop,
  onRetry,
  onTry,
  scrollSignal = 0,
}: AnswerListProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const followUntil = useRef(0);
  const heights = useRef(0);
  const signatureRef = useRef("");
  const [leftAt, setLeftAt] = useState<string | null>(null);
  const last = answers[answers.length - 1];
  const signature = last ? `${answers.length}:${last.id}:${last.status}:${last.text.length}` : "";
  const hasAnswers = answers.length > 0;
  const streaming = answers.some((a) => a.status === "streaming");

  // Track "at bottom" with an IntersectionObserver on a sentinel after the last card (no scroll polling). The panel
  // caps its height in every placement, so the list's own scrollport is the only one that matters.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scroller = scrollerRef.current;
    if (!hasAnswers || !sentinel || !scroller) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const listScrolls = scroller.scrollHeight > scroller.clientHeight + 1;
        const atBottom = !listScrolls || (entry?.isIntersecting ?? true);
        setLeftAt(atBottom ? null : signatureRef.current);
      },
      { root: scroller, rootMargin: `0px 0px ${NEAR_BOTTOM_PX}px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasAnswers]);

  // The reader's own scroll input ends the follow window at once, so a reader who scrolls up right after asking is not
  // pulled back down (WCAG 2.2.2: the user stays in control of auto-moving content).
  useEffect(() => {
    if (!hasAnswers) return;
    const controller = new AbortController();
    onScrollIntent(() => {
      followUntil.current = 0;
    }, controller.signal);
    return () => controller.abort();
  }, [hasAnswers]);

  // Scrolls the list's own scrollport only. `scrollIntoView` would also scroll every ancestor, and the panel is sticky
  // in a scrolling page, so each flush of a streaming answer moved the whole dashboard.
  function scrollToEnd(smooth: boolean) {
    if (smooth) followUntil.current = performance.now() + FOLLOW_MS;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      top: scroller.scrollHeight,
      behavior: smooth && !prefersReducedMotion() ? "smooth" : "instant",
    });
  }

  // How far the end of the content is below the visible area, in px, before the content last grew.
  // A synchronous read, because the observers above report a frame late: a flush that lands before they do would
  // otherwise pull a reader back down who has just scrolled up.
  function distanceBeforeGrowth(): number {
    const scroller = scrollerRef.current;
    if (!scroller) return 0;
    const grown = scroller.scrollHeight - heights.current;
    return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight - Math.max(grown, 0);
  }

  function rememberHeights() {
    const scroller = scrollerRef.current;
    if (scroller) heights.current = scroller.scrollHeight;
  }

  // Follow the stream only if the reader was within 48 px of the bottom before this flush.
  useLayoutEffect(() => {
    signatureRef.current = signature;
    // Right after a question the smooth scroll to its card is still under way, so keep following meanwhile.
    const following =
      performance.now() < followUntil.current || distanceBeforeGrowth() <= NEAR_BOTTOM_PX;
    if (signature && following) scrollToEnd(false);
    rememberHeights();
  }, [signature]);

  // A new question or retry always brings its card into view.
  const firstSignal = useRef(scrollSignal);
  useLayoutEffect(() => {
    if (scrollSignal === firstSignal.current) return;
    scrollToEnd(true);
    rememberHeights();
  }, [scrollSignal]);

  const showNewText = hasAnswers && leftAt !== null && leftAt !== signature;
  // More answer below the panel's edge: the list fades out over its last 24 px instead of cutting text off.
  const moreBelow = hasAnswers && leftAt !== null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {hasAnswers ? (
        <div
          ref={scrollerRef}
          role="region"
          aria-label="Conversation"
          tabIndex={0}
          className="min-h-0 scroll-pb-4 overflow-y-auto overscroll-contain rounded-control"
        >
          <ol className="flex flex-col gap-4" aria-busy={streaming}>
            {answers.map((a) => (
              <li key={a.id} className={a.retried ? "answer-retry" : undefined}>
                <AnswerCard
                  answer={a}
                  isLatest={a.id === last?.id}
                  onStop={() => onStop(a.id)}
                  onRetry={() => onRetry(a.id)}
                  onTry={onTry}
                />
              </li>
            ))}
          </ol>
          <div ref={sentinelRef} aria-hidden className="h-px" />
        </div>
      ) : (
        <EmptyState context={context} onPick={onPick} />
      )}
      {moreBelow ? (
        <div
          aria-hidden
          data-slot="answers-fade"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-b from-transparent to-[var(--panel-bg,var(--surface-raised))]"
        />
      ) : null}
      {showNewText ? (
        <Button
          type="button"
          variant="ghost"
          aria-label="Scroll to newest answer"
          onClick={() => scrollToEnd(true)}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 max-lg:right-3 max-lg:left-auto max-lg:translate-x-0 layer-overlay"
        >
          New text
          <ArrowDown aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
        </Button>
      ) : null}
    </div>
  );
}
