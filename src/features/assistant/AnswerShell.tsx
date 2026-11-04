import type { ReactNode } from "react";

import { Eyebrow } from "@/components/Eyebrow";
import { CircleAlert, ICON_STROKE, RotateCw, Sparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";

/**
 * The parts of an answer that must render even when the answer card's own chunk has not loaded (offline, a failed
 * download): the question echo, the AI card shell and the failed row. AnswerCard and its fallback share them, so
 * there is one failed card everywhere.
 */

export const FAILED_EMPTY = "Request failed · nothing was answered";
export const FAILED_PARTIAL = "Request failed · partial answer";

/** Design-system.md 6.5: what was asked, and about what, right-aligned above the AI card. */
export function QuestionEcho({
  question,
  about,
}: {
  question: string;
  about?: string | undefined;
}) {
  return (
    <div data-slot="question-echo" className="flex flex-col items-end gap-1.5">
      <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
        {about ? (
          <>
            Asked about <span className="font-semibold text-ink-2">{about}</span>
          </>
        ) : (
          "You asked"
        )}
      </p>
      <p className="max-w-[92%] rounded-card border border-border bg-surface-2 px-3 py-2 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink">
        {question}
      </p>
    </div>
  );
}

export function AiCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-ai-border bg-ai-bg shadow-card p-[var(--pad-card)]">
      {children}
    </div>
  );
}

export function AiLabel() {
  return (
    <Eyebrow className="inline-flex items-center gap-1.5 text-ai-label">
      <Sparkles aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
      AI-generated
    </Eyebrow>
  );
}

/** Retry's icon and label: the one look of Retry, here and in the stopped card's header (one Stop/Retry button). */
export function RetryLabel() {
  return (
    <>
      <RotateCw aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
      Retry
    </>
  );
}

/** Retry on a failed card: the same ghost sm button as the header's. */
export function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button type="button" size="sm" variant="ghost" onClick={onRetry}>
      <RetryLabel />
    </Button>
  );
}

/** The failed row: what happened, and Retry beside it. */
export function FailedRow({ partial, onRetry }: { partial: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <p className="inline-flex items-start gap-1.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink">
        <CircleAlert
          aria-hidden
          className="size-4 shrink-0 text-bad-mark"
          strokeWidth={ICON_STROKE}
        />
        {partial ? FAILED_PARTIAL : FAILED_EMPTY}
      </p>
      <RetryButton onRetry={onRetry} />
    </div>
  );
}
