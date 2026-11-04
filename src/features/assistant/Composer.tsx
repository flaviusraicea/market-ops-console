"use client";

import { useEffect, useLayoutEffect, type Ref } from "react";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { ArrowUp, ICON_STROKE, X } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatInt } from "@/lib/format";
import { warmAnswerCard } from "./AnswerCardLazy";

const MAX_ROWS = 4;
/** The longest question the composer sends; the counter shows from COUNT_FROM. */
const MAX_CHARS = 1000;
const COUNT_FROM = 900;

/**
 * `field-sizing: content` grows the box with its text, capped by max-h, and re-measures by itself when the panel is
 * shown or resized. Browsers without it use `fitToText`.
 */
const NATIVE_SIZING = typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");

/** The auto-grow fallback: up to MAX_ROWS lines, then scroll. */
function fitToText(value: string) {
  const el = document.getElementById("ask");
  // Hidden (a collapsed rail, an inactive view) measures 0: write nothing and wait for the next resize.
  if (!(el instanceof HTMLTextAreaElement) || el.offsetParent === null) return;
  el.style.height = "auto";
  // An empty box is one row: scrollHeight would count a wrapped placeholder.
  if (value === "") return;
  const line = parseFloat(getComputedStyle(el).lineHeight) || 20;
  const pad = el.offsetHeight - el.clientHeight + 12;
  el.style.height = `${Math.min(el.scrollHeight, line * MAX_ROWS + pad)}px`;
}

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
  useLayoutEffect(() => {
    if (!NATIVE_SIZING) fitToText(value);
  }, [value]);
  useEffect(() => {
    const el = document.getElementById("ask");
    if (NATIVE_SIZING || !(el instanceof HTMLTextAreaElement)) return;
    const observer = new ResizeObserver(() => fitToText(el.value));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tooLong = value.length > MAX_CHARS;
  const showCount = value.length >= COUNT_FROM;

  function submit() {
    const question = value.trim();
    // While an answer streams the draft stays and Enter does nothing; Stop or wait, then send.
    if (!question || disabled || tooLong) return;
    onSubmit(question);
    onChange("");
  }

  return (
    // A hairline under the composer separates what you type from the answers that scroll below it.
    <div className="flex flex-col gap-2 border-b border-border pb-4">
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
          // Typing stays open while an answer streams, so a follow-up can be drafted; only sending waits.
          aria-invalid={tooLong || undefined}
          aria-describedby={
            [
              disabled ? "ask-wait" : "",
              showCount ? "ask-count" : "",
              note ? "ask-note" : "",
              simulated ? "ask-live" : "",
            ]
              .filter(Boolean)
              .join(" ") || undefined
          }
          placeholder="Ask about a market or period…"
          onChange={(e) => {
            // The first keystroke is the cue that an answer is coming.
            warmAnswerCard();
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          className="field-sizing-content min-h-[var(--composer-row)] max-h-[100px] resize-none overflow-y-auto"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send"
          disabled={disabled || tooLong}
          className="size-[var(--composer-row)]"
        >
          <ArrowUp aria-hidden className="size-[18px]" strokeWidth={ICON_STROKE} />
        </Button>
      </form>
      {disabled || showCount ? (
        <div className="flex items-start justify-between gap-3 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
          {disabled ? <p id="ask-wait">Wait for the answer, or Stop.</p> : <span />}
          {showCount ? (
            <p
              id="ask-count"
              className={cn("num shrink-0", tooLong && "font-medium text-bad-text")}
            >
              {formatInt(value.length)} / {formatInt(MAX_CHARS)}
            </p>
          ) : null}
        </div>
      ) : null}
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
