"use client";

import { useEffect, useRef, useState } from "react";

import { ICON_STROKE, Sparkles } from "@/components/icons";
import { logEvent } from "@/lib/events";
import type { AskStream } from "@/lib/stream/chatClient";
import { AnswerList } from "./AnswerList";
import { useAskWhyRequest } from "./askWhy";
import { Composer } from "./Composer";
import { usePublishAnswers } from "./AnswerStore";
import { useAnswerMachine } from "./useAnswerMachine";

type PanelProps = {
  onSubmit?: (question: string) => void;
  /** Replaces the network stream; stories and tests use it. */
  stream?: AskStream;
};

/**
 * Owns the answer machine. From 1024 px the panel is sticky and only the answer list scrolls
 * (header row and composer stay put); below that it sits in the page flow.
 */
export function Panel({ onSubmit, stream }: PanelProps) {
  const [draft, setDraft] = useState("");
  const [scrollSignal, setScrollSignal] = useState(0);
  const ref = useRef<HTMLTextAreaElement>(null);
  const request = useAskWhyRequest();

  // An "Ask why" button elsewhere fills the composer and moves focus here.
  const [applied, setApplied] = useState(0);
  if (request && request.nonce !== applied) {
    setApplied(request.nonce);
    setDraft(request.text);
  }
  useEffect(() => {
    if (request) ref.current?.focus();
  }, [request]);

  const { answers, ask, stop, retry, isStreaming } = useAnswerMachine(stream);
  usePublishAnswers(answers);

  // The Try button on an abstain card fills the composer like "Ask why" does, and leaves sending to the user.
  function fill(text: string) {
    setDraft(text);
    ref.current?.focus();
  }

  function submit(question: string) {
    logEvent({ type: "ask", question });
    onSubmit?.(question);
    ask(question);
    setScrollSignal((n) => n + 1);
    // Focus stays in the textarea after Send (also when Send was clicked or a suggestion was picked).
    ref.current?.focus();
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[var(--pad-card)] lg:sticky lg:top-4 lg:max-h-[calc(100vh-var(--header-h)-32px)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] text-ai-label uppercase">
          <Sparkles aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
          Assistant
        </span>
        <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          Answers are AI-generated. Numbers link to source.
        </span>
      </div>
      <AnswerList
        answers={answers}
        onPick={submit}
        onTry={fill}
        onStop={stop}
        onRetry={(id) => {
          retry(id);
          setScrollSignal((n) => n + 1);
        }}
        scrollSignal={scrollSignal}
      />
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={submit}
        disabled={isStreaming}
        textareaRef={ref}
      />
    </div>
  );
}
