"use client";

import { useState, type ReactNode } from "react";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { Notice } from "@/components/Notice";
import {
  ChevronDown,
  CirclePause,
  CircleSlash,
  ICON_STROKE,
  Sparkles,
  Square,
  TriangleAlert,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useDataset } from "@/lib/context/dataset";
import { formatPeriodAbbr } from "@/lib/format";
import { SUGGESTIONS } from "./Suggestions";
import { CitationRow } from "./CitationRow";
import { SourcesTable } from "./SourcesTable";
import { useSourcesRows } from "./useSourcesRows";
import { renderWithCitations } from "./renderWithCitations";
import type { Answer } from "./useAnswerMachine";
import type { ConfidenceLevel } from "@/components/ConfidenceMeter";

type AnswerCardProps = {
  answer: Answer;
  onStop: () => void;
  onRetry: () => void;
  /** Puts a suggested question in the composer without sending it. */
  onTry: (text: string) => void;
  /** True for the newest answer; only its chips can show as pressed. */
  isLatest?: boolean;
};

const PILL =
  "inline-flex h-[var(--chip-h)] items-center gap-1 rounded-pill bg-surface-2 px-2.5 font-ui text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2";

const CAPTION =
  "text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] text-ink-muted";

/** Design-system.md 6.5: question echo, then the AI card. */
export function AnswerCard({ answer, onStop, onRetry, onTry, isLatest = true }: AnswerCardProps) {
  const { status, text, question } = answer;
  return (
    <div className="flex flex-col gap-2">
      <div data-slot="question-echo" className="flex flex-col items-end gap-1.5">
        <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          {answer.about ? (
            <>
              You asked, about <span className="font-semibold text-ink-2">{answer.about}</span>:
            </>
          ) : (
            "You asked:"
          )}
        </p>
        <p className="max-w-[92%] rounded-card bg-surface-2 px-3 py-2 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink">
          {question}
        </p>
      </div>
      {status === "failed" ? (
        <>
          {text ? (
            <Card>
              <CardHeader />
              <AnswerText>
                {text}{" "}
                <span className={`${PILL} align-middle`}>
                  <CirclePause aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
                  Failed · partial answer
                </span>
              </AnswerText>
            </Card>
          ) : null}
          <Notice
            title="Request failed"
            actions={
              <Button type="button" variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            }
          >
            The assistant could not answer. Nothing was changed.
          </Notice>
        </>
      ) : (
        <Card>
          <CardHeader
            confidence={
              status === "done" && answer.kind !== "abstain" ? answer.confidence : undefined
            }
          />
          <AnswerText>
            {status === "done" ? renderWithCitations(text, answer.citations, answer.id) : text}
            {status === "streaming" ? <span aria-hidden className="caret" /> : null}
            {status === "stopped" ? (
              <>
                {" "}
                <span className={`${PILL} align-middle`}>
                  <CirclePause aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
                  Stopped · partial answer
                </span>
              </>
            ) : null}
          </AnswerText>
          {status === "done" && answer.kind !== "abstain" ? (
            <ChipArea answer={answer} isLatest={isLatest} />
          ) : null}
          {status === "done" && answer.kind === "abstain" ? <AbstainNote onTry={onTry} /> : null}
          <Footer answer={answer} onStop={onStop} onRetry={onRetry} onTry={onTry} />
        </Card>
      )}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-ai-border bg-ai-bg p-[var(--pad-card)]">
      {children}
    </div>
  );
}

/** First row of the card: the AI label on the left, how far to trust it on the right (done answers only). */
function CardHeader({ confidence }: { confidence?: ConfidenceLevel | undefined }) {
  return (
    <div
      data-slot="card-header"
      className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1"
    >
      <span className="inline-flex items-center gap-1.5 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] text-ai-label uppercase">
        <Sparkles aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
        AI-generated
      </span>
      {confidence ? <ConfidenceMeter level={confidence} compact /> : null}
    </div>
  );
}

/** The disagreement note leads, on its own line; the citation chips follow in one wrapped row. */
function ChipArea({
  answer,
  isLatest,
}: {
  answer: Extract<Answer, { status: "done" }>;
  isLatest: boolean;
}) {
  const diffs = answer.citations.flatMap((c) =>
    c.resolution.ok && c.resolution.disagreement ? [c.resolution.disagreement] : [],
  );
  const first = diffs[0];
  return (
    <div data-slot="chip-area" className="flex flex-col items-start gap-1.5">
      {first ? (
        <p
          role="note"
          className="inline-flex max-w-full items-center gap-1.5 rounded-pill bg-warn-bg px-2.5 py-1 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-warn-text"
        >
          <TriangleAlert aria-hidden className="size-3 shrink-0" strokeWidth={ICON_STROKE} />
          <span>
            Differs from source: {first.assistant} here, {first.source.replace("_", " ")} in
            data.json
            {diffs.length > 1 ? ` · ${diffs.length} differences` : ""}
          </span>
        </p>
      ) : null}
      <CitationRow answerId={answer.id} citations={answer.citations} isLatest={isLatest} />
    </div>
  );
}

function AnswerText({ children }: { children: ReactNode }) {
  return (
    <p className="font-display text-[length:var(--text-answer)] leading-[var(--text-answer-lh)] font-[var(--text-answer-weight)] text-ink">
      {children}
    </p>
  );
}

/** Design-system.md 6.5 state 4: what the data covers, and a question the assistant can answer. */
function AbstainNote({ onTry }: { onTry: (text: string) => void }) {
  const { periods } = useDataset().meta;
  const first = periods[0];
  const last = periods[periods.length - 1];
  const suggestion = SUGGESTIONS[0];
  return (
    <div className="flex flex-col items-start gap-2">
      {first && last ? (
        <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          Data covers {formatPeriodAbbr(first)} to {formatPeriodAbbr(last)}.
        </p>
      ) : null}
      <Button type="button" variant="ghost" className="-ml-3" onClick={() => onTry(suggestion)}>
        Try: &ldquo;{suggestion}&rdquo;
      </Button>
    </div>
  );
}

/** Show sources opens by itself only when the assistant disagrees with the data, so that is the first thing seen. */
function SourcesDisclosure({ answer }: { answer: Extract<Answer, { status: "done" }> }) {
  const sources = useSourcesRows(answer.citations);
  const disagrees = answer.citations.some((c) => c.resolution.ok && c.resolution.disagreement);
  const [open, setOpen] = useState(disagrees);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="-ml-3 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] text-ink-2 uppercase"
        >
          <ChevronDown
            aria-hidden
            className="size-3.5 transition-transform duration-[var(--dur-fast)] [[aria-expanded=false]_&]:-rotate-90"
            strokeWidth={ICON_STROKE}
          />
          {open ? "Hide sources" : "Show sources"} ({answer.citations.length})
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {sources.status === "ready" ? (
          <SourcesTable rows={sources.rows} caption={sources.caption} />
        ) : (
          <SourcesTable rows={[]} caption="" loading placeholderRows={answer.citations.length} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Footer({ answer, onStop, onRetry }: AnswerCardProps) {
  if (answer.status === "done" && answer.kind === "abstain") {
    return (
      <div className="flex">
        <span className={PILL}>
          <CircleSlash aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
          Can&rsquo;t answer from this data
        </span>
      </div>
    );
  }
  if (answer.status === "done") {
    return <SourcesDisclosure answer={answer} />;
  }
  if (answer.status === "streaming" || answer.status === "stopped") {
    // One button for both states, so focus stays on it when Stop turns into Retry.
    const streaming = answer.status === "streaming";
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className={CAPTION}>
          {streaming ? "STREAMING…" : "PARTIAL · NO SOURCES ATTACHED"}
        </span>
        <Button
          type="button"
          variant={streaming ? "secondary" : "ghost"}
          onClick={streaming ? onStop : onRetry}
        >
          {streaming ? (
            <>
              <Square aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
              Stop
            </>
          ) : (
            "Retry"
          )}
        </Button>
      </div>
    );
  }
  return null;
}
