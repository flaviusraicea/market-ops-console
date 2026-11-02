"use client";

import { useLayoutEffect, type Ref } from "react";

import { ArrowUp, ICON_STROKE } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_ROWS = 4;

type ComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (question: string) => void;
  disabled?: boolean;
  textareaRef?: Ref<HTMLTextAreaElement>;
};

export function Composer({ value, onChange, onSubmit, disabled, textareaRef }: ComposerProps) {
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
        disabled={disabled}
        placeholder="Ask about markets, products or periods…"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-40 resize-none overflow-y-auto"
      />
      <Button type="submit" size="icon" aria-label="Send" disabled={disabled}>
        <ArrowUp aria-hidden className="size-[18px]" strokeWidth={ICON_STROKE} />
      </Button>
    </form>
  );
}
