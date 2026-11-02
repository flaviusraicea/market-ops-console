"use client";

import { useRef, type KeyboardEvent } from "react";

import type { Mode } from "@/domain";
import { cn } from "@/components/cn";

const OPTIONS: ReadonlyArray<{ value: Mode; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "analyst", label: "Analyst" },
];

export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    const back = e.key === "ArrowLeft" || e.key === "ArrowUp";
    if (!forward && !back) return;
    e.preventDefault();
    const i = OPTIONS.findIndex((o) => o.value === mode);
    const next = (i + (forward ? 1 : -1) + OPTIONS.length) % OPTIONS.length;
    const target = OPTIONS[next];
    if (!target) return;
    onChange(target.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      onKeyDown={onKeyDown}
      className="inline-flex h-[var(--control-h)] items-center rounded-pill bg-surface-2 p-0.5"
    >
      {OPTIONS.map((o, i) => {
        const checked = o.value === mode;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-full rounded-pill border px-3 text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
              checked
                ? "border-border bg-surface font-semibold text-ink"
                : "border-transparent font-medium text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
