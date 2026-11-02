"use client";

import { useEffect, useRef, useState } from "react";

import { ICON_STROKE, Sparkles } from "@/components/icons";
import { logEvent } from "@/lib/events";
import { AnswerList } from "./AnswerList";
import { useAskWhyRequest } from "./askWhy";
import { Composer } from "./Composer";

export function Panel({ onSubmit }: { onSubmit?: (question: string) => void }) {
  const [draft, setDraft] = useState("");
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

  function pick(text: string) {
    setDraft(text);
    ref.current?.focus();
  }

  function submit(question: string) {
    logEvent({ type: "ask", question });
    onSubmit?.(question);
  }

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-[var(--pad-card)]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] text-ai-label uppercase">
          <Sparkles aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
          Assistant
        </span>
        <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          Answers are AI-generated. Numbers link to source.
        </span>
      </div>
      <AnswerList onPick={pick} />
      <Composer value={draft} onChange={setDraft} onSubmit={submit} textareaRef={ref} />
    </div>
  );
}
