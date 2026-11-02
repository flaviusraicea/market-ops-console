"use client";

import type { ReactNode } from "react";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { Notice } from "@/components/Notice";
import { ChevronDown, CirclePause, CircleSlash, ICON_STROKE, Square } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useDataset } from "@/lib/context/dataset";
import { formatPeriodAbbr } from "@/lib/format";
import { SUGGESTIONS } from "./Suggestions";
import type { Answer } from "./useAnswerMachine";

type AnswerCardProps = {
  answer: Answer;
  onStop: () => void;
  onRetry: () => void;
  /** Puts a suggested question in the composer without sending it. */
  onTry: (text: string) => void;
};

const PILL =
  "inline-flex h-[var(--chip-h)] items-center gap-1 rounded-pill bg-surface-2 px-2.5 font-ui text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2";

const CAPTION =
  "text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] text-ink-muted";

/** Design-system.md 6.5: question echo, then the AI card. Chips arrive in slice 6; until then they are plain labels. */
export function AnswerCard({ answer, onStop, onRetry, onTry }: AnswerCardProps) {
  const { status, text, question } = answer;
  return (
    <div className="flex flex-col gap-2">
      <p
        data-slot="question-echo"
        className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2"
      >
        <span className="text-ink-muted">You asked: </span>
        {question}
      </p>
      {status === "failed" ? (
        <>
          {text ? (
            <Card>
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
          <AnswerText>
            {text}
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
            <ul aria-label="Citations" className="flex flex-wrap gap-1.5">
              {answer.citations.map(({ citation, resolution }, i) => (
                <li key={i}>
                  <span className="inline-flex h-[var(--chip-h)] items-center rounded-pill bg-accent-soft px-2.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-accent">
                    {resolution.ok
                      ? resolution.target.label
                      : citation.label || "Unresolved source"}
                  </span>
                </li>
              ))}
            </ul>
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
    return (
      <Collapsible>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <ConfidenceMeter level={answer.confidence} />
          {/* Disabled until slice 7 renders the sources table. */}
          <CollapsibleTrigger asChild>
            <Button type="button" variant="ghost" disabled>
              Show sources
              <ChevronDown
                aria-hidden
                className="size-3.5 transition-transform duration-[var(--dur-fast)] [[aria-expanded=true]_&]:rotate-180"
                strokeWidth={ICON_STROKE}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          <table className="mt-3 w-full bg-surface text-left">
            <caption className="sr-only">Sources</caption>
            <thead>
              <tr>
                {["Claim", "Entity", "Period", "Source value", "Assistant"].map((h) => (
                  <th key={h} scope="col" className={CAPTION}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody />
          </table>
        </CollapsibleContent>
      </Collapsible>
    );
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
