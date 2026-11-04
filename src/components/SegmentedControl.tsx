"use client";

import { useRef, type KeyboardEvent } from "react";

import { cn } from "@/components/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  /** Disabled options stay in the tab-less set; `hint` is shown in a tooltip and read via aria-describedby. */
  disabled?: boolean;
  hint?: string;
  hintId?: string;
};

/** Pill-shaped radiogroup (design-system 6.x). Arrow keys move between enabled options. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  labelledBy,
}: {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
  labelledBy?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = options.filter((o) => !o.disabled);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !back) return;
    e.preventDefault();
    const i = enabled.findIndex((o) => o.value === value);
    const target = enabled[(i + (forward ? 1 : -1) + enabled.length) % enabled.length];
    if (!target) return;
    onChange(target.value);
    refs.current[options.findIndex((o) => o.value === target.value)]?.focus();
  }

  return (
    <TooltipProvider>
      <div
        role="radiogroup"
        {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
        {...(labelledBy ? { "aria-labelledby": labelledBy } : {})}
        onKeyDown={onKeyDown}
        className="inline-flex h-[var(--track-h)] items-center rounded-pill bg-bg p-0.5"
      >
        {options.map((o, i) => {
          const checked = o.value === value;
          const button = (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-disabled={o.disabled || undefined}
              aria-describedby={o.disabled ? o.hintId : undefined}
              tabIndex={checked ? 0 : -1}
              onClick={() => {
                if (!o.disabled) onChange(o.value);
              }}
              className={cn(
                "h-full rounded-pill border px-3 text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
                checked
                  ? "border-border bg-surface font-semibold text-ink"
                  : "border-transparent font-medium text-ink-2 hover:text-ink",
                o.disabled && "cursor-not-allowed text-ink-disabled hover:text-ink-disabled",
              )}
            >
              {o.label}
            </button>
          );
          return o.disabled && o.hint ? (
            <Tooltip key={o.value}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent>{o.hint}</TooltipContent>
            </Tooltip>
          ) : (
            button
          );
        })}
      </div>
    </TooltipProvider>
  );
}
