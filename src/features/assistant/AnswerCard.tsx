"use client";

import { useState, type ReactNode } from "react";

import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { EYEBROW_CLASS, Eyebrow } from "@/components/Eyebrow";
import {
  ChevronDown,
  CircleSlash,
  CircleAlert,
  ICON_STROKE,
  Info,
  RotateCw,
  Sparkles,
  TriangleAlert,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { STATUS_RULE_TEXT, asksWhyStatus } from "@/domain";
import { useDataset } from "@/lib/context/dataset";
import { formatPeriodAbbr } from "@/lib/format";
import { scopeNote } from "./scopeNote";
import { SUGGESTIONS } from "./Suggestions";
import { CitationRow, useFollowCitation } from "./CitationRow";
import { SourcesTable } from "./SourcesTable";
import { useSourcesRows } from "./useSourcesRows";
import { renderWithCitations, splitParagraphs } from "./renderWithCitations";
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

const CAPTION = `${EYEBROW_CLASS} text-ink-muted`;

/** A quiet state line, not an eyebrow: sentence case, no warning colour, no icon. */
const STATE_NOTE =
  "text-pretty text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted";

/** A stopped answer says so in the header (in place of the confidence meter) and, under its text, that it has no sources. */
const STOPPED_BADGE = "Partial \u00b7 stopped";
const FAILED_EMPTY = "Request failed \u00b7 nothing was answered";
const FAILED_PARTIAL = "Request failed \u00b7 partial answer";
const NO_SOURCES_NOTE: Record<"stopped" | "failed", string> = {
  stopped: "Stopped before sources arrived. Retry to get citations.",
  failed: "Request failed before sources arrived. Retry to get citations.",
};

/** Design-system.md 6.5: question echo, then the AI card. */
export function AnswerCard({ answer, onStop, onRetry, onTry, isLatest = true }: AnswerCardProps) {
  const { status, text, question } = answer;
  const ds = useDataset();
  const scope = scopeNote(ds, answer);
  return (
    <div className="flex flex-col gap-2">
      <div data-slot="question-echo" className="flex flex-col items-end gap-1.5">
        <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          {answer.about ? (
            <>
              Asked about <span className="font-semibold text-ink-2">{answer.about}</span>
            </>
          ) : (
            "You asked"
          )}
        </p>
        <p className="max-w-[92%] rounded-card border border-border bg-surface-2 px-3 py-2 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink">
          {question}
        </p>
      </div>
      {status === "failed" ? (
        // The same AI card as every other state, so a failure reads as this answer's outcome, not a page alert.
        <Card>
          <CardHeader status="failed" />
          {text ? <AnswerText body={[text]} trailing={null} /> : null}
          <div role="alert" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="inline-flex items-start gap-1.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink">
              <CircleAlert
                aria-hidden
                className="size-4 shrink-0 text-bad-mark"
                strokeWidth={ICON_STROKE}
              />
              {text ? FAILED_PARTIAL : FAILED_EMPTY}
            </p>
            <RetryButton onRetry={onRetry} />
          </div>
          {text ? <p className={STATE_NOTE}>{NO_SOURCES_NOTE.failed}</p> : null}
        </Card>
      ) : (
        <Card>
          <CardHeader
            status={status}
            confidence={
              status === "done" && answer.kind !== "abstain" ? answer.confidence : undefined
            }
            onStop={onStop}
            onRetry={onRetry}
          />
          {scope ? <ScopeNote>{scope}</ScopeNote> : null}
          <AnswerText
            body={
              status === "done" ? renderWithCitations(text, answer.citations, answer.id) : [text]
            }
            trailing={status === "streaming" ? <span aria-hidden className="caret" /> : null}
          />
          {status === "stopped" ? <p className={STATE_NOTE}>{NO_SOURCES_NOTE.stopped}</p> : null}
          {status === "done" && answer.kind !== "abstain" ? (
            <ChipArea answer={answer} isLatest={isLatest} />
          ) : null}
          {status === "done" && answer.kind === "abstain" ? (
            <AbstainNote question={question} onTry={onTry} />
          ) : null}
          <Footer answer={answer} />
        </Card>
      )}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-ai-border bg-ai-bg shadow-card p-[var(--pad-card)]">
      {children}
    </div>
  );
}

/**
 * First row of the card, 24 px high in every state so nothing under it moves when the state changes. The AI label
 * is on the left (with a caption while streaming); on the right Stop, then the confidence meter, or the stopped badge
 * and Retry, swap in place. One button serves Stop and Retry, so focus stays on it when Stop turns into Retry.
 */
function CardHeader({
  status,
  confidence,
  onStop,
  onRetry,
}: {
  status?: Answer["status"];
  confidence?: ConfidenceLevel | undefined;
  onStop?: () => void;
  onRetry?: () => void;
}) {
  const streaming = status === "streaming";
  const stopped = status === "stopped";
  return (
    <div
      data-slot="card-header"
      className="flex min-h-[var(--chip-h)] items-center justify-between gap-x-3"
    >
      <div className="flex min-w-0 items-center gap-x-2.5">
        <Eyebrow className="inline-flex items-center gap-1.5 text-ai-label">
          <Sparkles aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
          AI-generated
        </Eyebrow>
        {streaming ? <span className={CAPTION}>STREAMING…</span> : null}
      </div>
      <div className="flex items-center gap-x-1.5">
        {stopped ? <Badge variant="warn">{STOPPED_BADGE}</Badge> : null}
        {streaming || stopped ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={streaming ? onStop : onRetry}
            {...(streaming ? { "aria-label": "Stop generating" } : {})}
          >
            {streaming ? (
              <>
                {/* A filled square mark, so it reads as the media stop symbol and not as an empty checkbox. */}
                <span aria-hidden className="size-2 bg-current" />
                Stop
              </>
            ) : (
              <>
                <RotateCw aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
                Retry
              </>
            )}
          </Button>
        ) : confidence ? (
          <ConfidenceMeter level={confidence} compact />
        ) : null}
      </div>
    </div>
  );
}

/** Retry on a failed card: the same ghost button the stopped card's header uses. */
function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button type="button" size="sm" variant="ghost" onClick={onRetry}>
      <RotateCw aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
      Retry
    </Button>
  );
}

/** The answer covers more than the view it was asked from (scopeNote.ts); it leads the text so it is read first. */
function ScopeNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="note"
      className="inline-flex items-start gap-1.5 text-pretty text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted"
    >
      <Info aria-hidden className="size-4 shrink-0" strokeWidth={ICON_STROKE} />
      <span>{children}</span>
    </p>
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
  const sources = useSourcesRows(answer.citations, answer.question);
  const checks = sources.status === "ready" ? sources.checks : [];
  return (
    <div data-slot="chip-area" className="flex flex-col items-start gap-1.5">
      {first ? (
        <DiffersNote>
          Differs from source: {first.assistant} here, {first.source.replace("_", " ")} in data.json
          {diffs.length > 1 ? ` · ${diffs.length} differences` : ""}
        </DiffersNote>
      ) : null}
      {checks.map((line) => (
        <DiffersNote key={line} long>
          {line}
        </DiffersNote>
      ))}
      <CitationRow answerId={answer.id} citations={answer.citations} isLatest={isLatest} />
    </div>
  );
}

/** One "Differs from source" line: the answer says one thing, data.json another. */
function DiffersNote({ children, long }: { children: ReactNode; long?: boolean }) {
  return (
    <p
      role="note"
      className={`inline-flex max-w-full items-start gap-1.5 ${long ? "rounded-card" : "rounded-pill"} bg-warn-bg px-2.5 py-1 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-warn-text`}
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" strokeWidth={ICON_STROKE} />
      <span>{children}</span>
    </p>
  );
}

/** The answer in paragraphs (a blank line in the text starts one); `trailing` stays at the end of the last. */
function AnswerText({ body, trailing }: { body: ReactNode[]; trailing: ReactNode }) {
  const paragraphs = splitParagraphs(body);
  const last = paragraphs.length - 1;
  return (
    <div className="flex flex-col gap-3">
      {paragraphs.map((nodes, i) => (
        <p
          key={i}
          className="font-display text-[length:var(--text-answer)] leading-[var(--text-answer-lh)] font-[var(--text-answer-weight)] text-ink"
        >
          {nodes}
          {i === last ? trailing : null}
        </p>
      ))}
    </div>
  );
}

/**
 * Design-system.md 6.5 state 4: what the data covers, and a question the assistant can answer. A "why is it at
 * risk?" question is answered with the rule the status follows, since that is all the data says about it.
 */
function AbstainNote({ question, onTry }: { question: string; onTry: (text: string) => void }) {
  const { periods } = useDataset().meta;
  const first = periods[0];
  const last = periods[periods.length - 1];
  const suggestion = SUGGESTIONS[0];
  return (
    <div className="flex flex-col items-start gap-2">
      {asksWhyStatus(question) ? (
        <p className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
          {STATUS_RULE_TEXT}
        </p>
      ) : first && last ? (
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
  const follow = useFollowCitation(answer.id, answer.citations);
  const disagrees = answer.citations.some((c) => c.resolution.ok && c.resolution.disagreement);
  const [open, setOpen] = useState(disagrees);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" className="-ml-3 text-ink-2">
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
          <SourcesTable rows={sources.rows} caption={sources.caption} onFollow={follow} />
        ) : (
          <SourcesTable rows={[]} caption="" loading placeholderRows={answer.citations.length} />
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function Footer({ answer }: Pick<AnswerCardProps, "answer">) {
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
    // A fallback answer cites nothing, so there is nothing to disclose.
    return answer.citations.length > 0 ? <SourcesDisclosure answer={answer} /> : null;
  }
  return null;
}
