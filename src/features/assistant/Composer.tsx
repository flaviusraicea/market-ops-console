"use client";

import { useLayoutEffect, type Ref } from "react";

import { Eyebrow } from "@/components/Eyebrow";
import { ArrowUp, ICON_STROKE, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { preloadAnswerCard } from "./AnswerCardLazy";

const MAX_ROWS = 4;

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (question: string) => void;
  disabled?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
  /** Where the pending question was asked from, e.g. "Germany · Mar 2026". Shown as a chip above the box. */
  about?: string | null;
  /** The chip's ×: drops the context, keeps the text. */
  onClearAbout?: () => void;
  /** A helper line under the box, e.g. where the text was filled from. */
  note?: string | null;
  /** Live data is on: say that answers still come from the saved data. */
  simulated?: boolean;
};

export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  textareaRef,
  about,
  onClearAbout,
  note,
  simulated,
}: ComposerProps) {
  // Auto-grow up to MAX_ROWS lines, then scroll.
  useLayoutEffect(() => {
    const el = document.getElementById("ask");
    if (!(el instanceof HTMLTextAreaElement)) return;
    el.style.height = "auto";
    const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
    const pad = el.offsetHeight - el.clientHeight + 12;
    el.style.height = `${Math.min(el.scrollHeight, line * MAX_ROWS + pad)}px`;
  }, [value]);

  function submit() {
    const question = value.trim();
    if (!question || disabled) return;
    onSubmit(question);
    onChange("");
  }

  return (
    <div className="flex flex-col gap-2">
      {about ? (
        <div className="flex items-center gap-2">
          <Eyebrow>About</Eyebrow>
          <span className="inline-flex h-[var(--chip-h)] items-center gap-1 rounded-pill border border-ai-border bg-ai-bg pr-1 pl-2.5 text-[length:var(--text-label)] leading-none font-medium text-ai-label">
            {about}
            <button
              type="button"
              aria-label={`Clear context ${about}`}
              onClick={onClearAbout}
              className="grid size-5 place-items-center rounded-pill hover:bg-surface/60"
            >
              <X aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
            </button>
          </span>
        </div>
      ) : null}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="ask" className="sr-only">
          Ask the assistant
        </label>
        <Textarea
          id="ask"
          ref={textareaRef}
          rows={1}
          value={value}
          // Read-only rather than disabled while an answer streams, so the textarea keeps focus.
          readOnly={disabled}
          aria-disabled={disabled || undefined}
          aria-describedby={
            [note ? "ask-note" : "", simulated ? "ask-live" : ""].filter(Boolean).join(" ") ||
            undefined
          }
          placeholder="Ask about markets, products or periods…"
          onChange={(e) => {
            // The first keystroke is the cue that an answer is coming.
            preloadAnswerCard();
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="max-h-40 resize-none overflow-y-auto aria-disabled:cursor-not-allowed aria-disabled:bg-surface-2"
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={disabled}>
          <ArrowUp aria-hidden className="size-[18px]" strokeWidth={ICON_STROKE} />
        </Button>
      </form>
      {simulated ? (
        <p
          id="ask-live"
          className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted"
        >
          Live data is simulated; answers use the saved data.
        </p>
      ) : null}
      {note ? (
        <p
          id="ask-note"
          className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted"
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
