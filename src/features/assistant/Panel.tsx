"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { entityName, entityOf } from "@/domain";
import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { ChevronRight, ICON_STROKE, Sparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAssistantRail } from "@/features/shell/railState";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useDataset } from "@/lib/context/dataset";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { logEvent } from "@/lib/events";
import { prefersReducedMotion } from "@/lib/motion";
import type { AskStream } from "@/lib/stream/chatClient";
import { AnswerList } from "./AnswerList";
import { useAskWhyRequest, useRegisterAskSender, type AskContext } from "./askWhy";
import { Composer } from "./Composer";
import type { PanelContext } from "./EmptyState";
import { usePublishAnswers } from "./AnswerStore";
import { askContext } from "./questions";
import { useAnswerMachine } from "./useAnswerMachine";

type PanelProps = {
  /** What the empty state says about the current view. */
  context: PanelContext;
  onSubmit?: (question: string) => void;
  /** Replaces the network stream; stories and tests use it. */
  stream?: AskStream;
};

/**
 * Owns the answer machine. The composer sits at the top, under the header row, so it is the first thing
 * to reach with the keyboard. From 1024 px the panel is sticky and only the answer list scrolls;
 * below that it sits in the page flow.
 */
export function Panel({ context, onSubmit, stream }: PanelProps) {
  const [draft, setDraft] = useState("");
  const [scrollSignal, setScrollSignal] = useState(0);
  // Where a prefilled question came from, until it is sent or cleared. `note` is the composer's helper line.
  const [pending, setPending] = useState<{ ctx: AskContext; note: string | null } | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const request = useAskWhyRequest();
  const ds = useDataset();
  const { ctx } = useConsoleContext();
  const rail = useAssistantRail();
  const { open, collapse, focusRequest } = rail;
  const desktop = useMediaQuery("(min-width: 1024px)");
  const overlay = useMediaQuery("(min-width: 1024px) and (max-width: 1279px)") && open;
  const panelRef = useRef<HTMLDivElement>(null);

  const { answers, ask, stop, retry, isStreaming } = useAnswerMachine(stream);
  usePublishAnswers(answers);

  /** `about` comes from an entry point; `fromComposer` is true only for the draft a prefill produced. */
  function submit(question: string, about?: AskContext, fromComposer = false) {
    logEvent({ type: "ask", question });
    onSubmit?.(question);
    // Typed with no entry point: the question is about the view in the URL.
    const entity = entityOf(ctx);
    const where =
      about ??
      (fromComposer ? pending?.ctx : undefined) ??
      askContext(entity, entityName(ds, entity), ctx.period);
    ask(question, where.label);
    // Only sending the composer text uses up its context; a sent Ask why leaves the draft and chip alone.
    if (fromComposer) setPending(null);
    setScrollSignal((n) => n + 1);
    // Focus stays in the textarea after Send (also when Send was clicked or a suggestion was picked).
    ref.current?.focus();
  }

  // An "Ask why" button elsewhere either sends its question or fills the composer; both move focus here.
  useRegisterAskSender((text, about) => {
    if (isStreaming) return false;
    submit(text, about);
    return true;
  });
  const [applied, setApplied] = useState(0);
  if (request && request.nonce !== applied) {
    setApplied(request.nonce);
    if (request.fill) {
      setDraft(request.text);
      setPending(
        request.ctx
          ? {
              ctx: request.ctx,
              note: request.from ? `Filled from ${request.from}. Edit, then press Enter.` : null,
            }
          : null,
      );
    }
  }
  useEffect(() => {
    if (!request) return;
    const el = ref.current;
    el?.focus();
    // Below 1024 px the panel sits under the dashboard, so bring it into view.
    if (el && !window.matchMedia("(min-width: 1024px)").matches) {
      el.scrollIntoView({
        block: "center",
        behavior: prefersReducedMotion() ? "instant" : "smooth",
      });
    }
  }, [request]);

  // Opening from the rail toggle lands on the panel heading; entry points land in the composer (above).
  const handledFocus = useRef(focusRequest?.nonce);
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === handledFocus.current) return;
    handledFocus.current = focusRequest.nonce;
    if (focusRequest.target === "heading") headingRef.current?.focus();
  }, [focusRequest]);

  // The Try button on an abstain card fills the composer like "Ask why" does, and leaves sending to the user.
  function fill(text: string) {
    setDraft(text);
    setPending(null);
    ref.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!desktop) return;
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.preventDefault();
      collapse();
      return;
    }
    // The overlay is modal: Tab wraps inside it.
    if (e.key === "Tab" && overlay && panelRef.current) {
      const items = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([readonly]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div
      ref={panelRef}
      id="assistant-panel"
      {...(overlay ? { role: "dialog", "aria-modal": true, "aria-labelledby": "assistant-h" } : {})}
      onKeyDown={onKeyDown}
      className={cn(
        "flex flex-col gap-4 rounded-card border border-border bg-surface p-[var(--pad-card)]",
        // From 1280 px the panel is sticky in its column; from 1024 to 1279 px it overlays the dashboard when open.
        "xl:sticky xl:max-h-[calc(100vh-var(--header-h)-32px)]",
        // Analyst pins its header, so the panel sticks below it.
        ctx.mode === "analyst" ? "xl:top-[calc(var(--header-h)+16px)]" : "xl:top-4",
        "lg:max-xl:fixed lg:max-xl:top-[calc(var(--header-h)+16px)] lg:max-xl:right-4 lg:max-xl:bottom-4 lg:max-xl:z-50 lg:max-xl:w-[var(--assistant-w)] lg:max-xl:shadow-popover",
        !open && "lg:hidden",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2
            id="assistant-h"
            ref={headingRef}
            tabIndex={-1}
            className="w-fit rounded-control outline-offset-2"
          >
            <Eyebrow className="inline-flex items-center gap-1.5 text-ai-label">
              <Sparkles aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
              Assistant
            </Eyebrow>
          </h2>
          <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
            Answers are AI-generated. Numbers link to source.
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Collapse assistant"
          aria-controls="assistant-panel"
          aria-expanded
          onClick={collapse}
          className="max-lg:hidden"
        >
          <ChevronRight aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
        </Button>
      </div>
      <Composer
        value={draft}
        onChange={(v) => {
          setDraft(v);
          // Editing the filled text drops the "Filled from" line; the About chip stays until sent or cleared.
          setPending((p) => (p?.note ? { ...p, note: null } : p));
        }}
        onSubmit={(q) => submit(q, undefined, true)}
        disabled={isStreaming}
        textareaRef={ref}
        about={pending?.ctx.label ?? null}
        onClearAbout={() => setPending(null)}
        note={pending?.note ?? null}
      />
      <AnswerList
        answers={answers}
        context={context}
        onPick={(q) => submit(q)}
        onTry={fill}
        onStop={stop}
        onRetry={(id) => {
          retry(id);
          setScrollSignal((n) => n + 1);
        }}
        scrollSignal={scrollSignal}
      />
    </div>
  );
}
