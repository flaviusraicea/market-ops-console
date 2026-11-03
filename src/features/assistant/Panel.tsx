"use client";

import { useEffect, useRef, useState } from "react";

import { entityName, entityOf } from "@/domain";
import { PaletteButton } from "@/features/palette/PaletteButton";
import { Eyebrow } from "@/components/Eyebrow";
import { ICON_STROKE, Sparkles } from "@/components/icons";
import { useDataset } from "@/lib/context/dataset";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { formatPeriod } from "@/lib/format";
import { logEvent } from "@/lib/events";
import { prefersReducedMotion } from "@/lib/motion";
import type { AskStream } from "@/lib/stream/chatClient";
import { AnswerList } from "./AnswerList";
import { useAskWhyRequest, useRegisterAskSender } from "./askWhy";
import { Composer } from "./Composer";
import type { PanelContext } from "./EmptyState";
import { usePublishAnswers } from "./AnswerStore";
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
  const ref = useRef<HTMLTextAreaElement>(null);
  const request = useAskWhyRequest();
  const ds = useDataset();
  const { ctx } = useConsoleContext();

  const { answers, ask, stop, retry, isStreaming } = useAnswerMachine(stream);
  usePublishAnswers(answers);

  function submit(question: string, about?: string) {
    logEvent({ type: "ask", question });
    onSubmit?.(question);
    ask(question, about ?? `${entityName(ds, entityOf(ctx))} · ${formatPeriod(ctx.period)}`);
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
    if (request.fill) setDraft(request.text);
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

  // The Try button on an abstain card fills the composer like "Ask why" does, and leaves sending to the user.
  function fill(text: string) {
    setDraft(text);
    ref.current?.focus();
  }

  return (
    <div className="relative flex flex-col gap-4 rounded-card border border-border bg-surface p-[var(--pad-card)] lg:sticky lg:top-4 lg:max-h-[calc(100vh-var(--header-h)-32px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pr-[var(--control-h)]">
        <Eyebrow className="inline-flex items-center gap-1.5 text-ai-label">
          <Sparkles aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
          Assistant
        </Eyebrow>
        <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          Answers are AI-generated. Numbers link to source.
        </span>
      </div>
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        disabled={isStreaming}
        textareaRef={ref}
      />
      {/* After the composer in the DOM so the composer stays first in tab order; placed top right. */}
      <div className="absolute top-[calc(var(--pad-card)-8px)] right-[calc(var(--pad-card)-8px)]">
        <PaletteButton />
      </div>
      <AnswerList
        answers={answers}
        context={context}
        onPick={submit}
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
