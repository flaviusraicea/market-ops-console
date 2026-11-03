import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { InfoTip } from "@/components/InfoTip";
import type { VerdictVM } from "./viewModel";

const STATUS_TEXT = {
  on_track: "text-ok-text",
  at_risk: "text-warn-text",
  off_track: "text-bad-text",
} as const;

const ATTENTION_TEXT = { bad: "text-bad-text", warn: "text-warn-text", none: "" } as const;

/**
 * The first line of the Overview: one sentence that answers "are we on track?". It is the page's h2.
 * Status and the attention phrase carry colour; every number gets a dotted underline and stays plain text.
 */
export function Verdict({ verdict }: { verdict: VerdictVM }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-x-4">
        <Eyebrow>{verdict.eyebrow}</Eyebrow>
        <InfoTip label="About this verdict">{verdict.caption}</InfoTip>
        <span className="sr-only">{verdict.caption}</span>
      </div>
      <h2
        id="verdict-h"
        className="num font-display text-[length:var(--text-display)] leading-[var(--text-display-lh)] font-semibold tracking-[var(--text-display-ls)] text-balance text-ink"
      >
        {verdict.segments.map((segment, i) => (
          <span
            key={i}
            className={cn(
              segment.role === "status" && STATUS_TEXT[verdict.status],
              segment.role === "attention" && ATTENTION_TEXT[verdict.attention],
              segment.role === "number" &&
                "underline decoration-border decoration-1 decoration-dotted underline-offset-[6px]",
            )}
          >
            {segment.text}
          </span>
        ))}
      </h2>
    </div>
  );
}
