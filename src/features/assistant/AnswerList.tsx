"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ArrowDown, ICON_STROKE } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAssistantRail } from "@/features/shell/railState";
import { prefersReducedMotion } from "@/lib/motion";
import { AnswerCard } from "./AnswerCard";
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

const NEAR_BOTTOM_PX = 48;
/** How long a smooth scroll to a new card keeps the list following the stream. */
const FOLLOW_MS = 500;
/** Keys that scroll the page or the list. */
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

const ANNOUNCEMENT: Partial<Record<Answer["status"], string>> = {
  done: "Answer complete",
  stopped: "Answer stopped",
  failed: "Answer failed",
};

/**
 * The session's answers, newest at the bottom. From 1024 px the panel caps its height, so the list is the only
 * scrolling part; below that nothing caps it and the page scrolls. It follows the stream only while the reader is at the bottom.
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
  const heights = useRef({ list: 0, page: 0 });
  const signatureRef = useRef("");
  const [leftAt, setLeftAt] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<{ n: number; text: string }>({ n: 0, text: "" });
  const seen = useRef(new Map<string, Answer["status"]>());

  const { liveHost, noteAnswerDone } = useAssistantRail();

  const last = answers[answers.length - 1];
  const signature = last ? `${answers.length}:${last.id}:${last.status}:${last.text.length}` : "";
  const hasAnswers = answers.length > 0;

  // Track "at bottom" with IntersectionObservers on a sentinel after the last card (no scroll polling).
  // One watches the list's own scrollport (from 1024 px the list scrolls inside the panel); the other watches the
  // viewport (below that the page scrolls). Whichever scrolls right now decides.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scroller = scrollerRef.current;
    if (!hasAnswers || !sentinel || !scroller) return;
    const seen = { list: true, page: true };
    const update = () => {
      const listScrolls = scroller.scrollHeight > scroller.clientHeight + 1;
      const atBottom = listScrolls ? seen.list : seen.page;
      setLeftAt(atBottom ? null : signatureRef.current);
    };
    const rootMargin = `0px 0px ${NEAR_BOTTOM_PX}px 0px`;
    const inList = new IntersectionObserver(
      ([entry]) => {
        seen.list = entry?.isIntersecting ?? true;
        update();
      },
      { root: scroller, rootMargin },
    );
    const inPage = new IntersectionObserver(
      ([entry]) => {
        seen.page = entry?.isIntersecting ?? true;
        update();
      },
      { rootMargin },
    );
    inList.observe(sentinel);
    inPage.observe(sentinel);
    return () => {
      inList.disconnect();
      inPage.disconnect();
    };
  }, [hasAnswers]);

  // The reader's own scroll input ends the follow window at once, so a reader who scrolls up right after asking is not
  // pulled back down (WCAG 2.2.2: the user stays in control of auto-moving content).
  useEffect(() => {
    const stopFollowing = () => {
      followUntil.current = 0;
    };
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key)) stopFollowing();
    };
    window.addEventListener("wheel", stopFollowing, { passive: true });
    window.addEventListener("touchmove", stopFollowing, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", stopFollowing);
      window.removeEventListener("touchmove", stopFollowing);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function scrollToEnd(smooth: boolean) {
    if (smooth) followUntil.current = performance.now() + FOLLOW_MS;
    sentinelRef.current?.scrollIntoView({
      block: "end",
      behavior: smooth && !prefersReducedMotion() ? "smooth" : "instant",
    });
  }

  // How far the end of the content is below the visible area, in px, before the content last grew.
  // A synchronous read, because the observers above report a frame late: a flush that lands before they do would
  // otherwise pull a reader back down who has just scrolled up.
  function distanceBeforeGrowth(): number {
    const scroller = scrollerRef.current;
    if (!scroller) return 0;
    const root = document.documentElement;
    if (scroller.scrollHeight > scroller.clientHeight + 1) {
      const grown = scroller.scrollHeight - heights.current.list;
      return (
        scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight - Math.max(grown, 0)
      );
    }
    const grown = root.scrollHeight - heights.current.page;
    return root.scrollHeight - window.scrollY - window.innerHeight - Math.max(grown, 0);
  }

  function rememberHeights() {
    const scroller = scrollerRef.current;
    if (scroller)
      heights.current = {
        list: scroller.scrollHeight,
        page: document.documentElement.scrollHeight,
      };
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

  // Screen-reader announcements for the end of an answer.
  useEffect(() => {
    for (const a of answers) {
      const before = seen.current.get(a.id);
      seen.current.set(a.id, a.status);
      const text = ANNOUNCEMENT[a.status];
      if (before === "streaming" && text) {
        setAnnouncement((p) => ({ n: p.n + 1, text }));
        if (a.status === "done") noteAnswerDone();
      }
    }
  }, [answers, noteAnswerDone]);

  const announced = <span key={announcement.n}>{announcement.text}</span>;
  const showNewText = hasAnswers && leftAt !== null && leftAt !== signature;

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
          <ol className="flex flex-col gap-4">
            {answers.map((a) => (
              <li key={a.id}>
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
      {showNewText ? (
        <Button
          type="button"
          variant="ghost"
          aria-label="Scroll to newest answer"
          onClick={() => scrollToEnd(true)}
          className="absolute bottom-3 left-1/2 -translate-x-1/2 border border-border bg-surface shadow-[var(--shadow-popover)]"
        >
          New text
          <ArrowDown aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
        </Button>
      ) : null}
      {liveHost === undefined ? (
        <div role="status" aria-live="polite" className="sr-only">
          {announced}
        </div>
      ) : liveHost ? (
        // The shell's live region stays mounted while the panel is collapsed.
        createPortal(announced, liveHost)
      ) : null}
    </div>
  );
}
