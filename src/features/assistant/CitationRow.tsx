"use client";

import { CitationChip } from "@/components/CitationChip";
import { useAssistantRail } from "@/features/shell/railState";
import { useDataset } from "@/lib/context/dataset";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useFollowed } from "./AnswerStore";
import { targetToContext } from "./targetToContext";
import type { Resolved } from "./useAnswerMachine";

type CitationRowProps = {
  answerId: string;
  citations: readonly Resolved[];
  /** Only the latest answer shows a pressed chip: `cite` indexes into that answer. */
  isLatest: boolean;
};

export const chipId = (answerId: string, i: number) => `chip-${answerId}-${i}`;

/**
 * Following citation `i` of an answer: the target goes into the URL as a history entry and the assistant opens in the
 * target's mode. The chips and the sources list share it, so both land the same way.
 */
export function useFollowCitation(answerId: string, citations: readonly Resolved[]) {
  const ds = useDataset();
  const { setContext } = useConsoleContext();
  const { openIn } = useAssistantRail();
  const { follow } = useFollowed();
  return (i: number) => {
    const resolution = citations[i]?.resolution;
    if (!resolution?.ok) return;
    const next = targetToContext(resolution.target, ds);
    // A followed citation lands in Analyst; the answer that led there stays on screen.
    if (next.mode) openIn(next.mode);
    follow(answerId, i);
    setContext({ ...next, cite: i }, { history: "push" });
  };
}

/** Chips in citation order. Following one writes the target into the URL as a history entry. */
export function CitationRow({ answerId, citations, isLatest }: CitationRowProps) {
  const { ctx } = useConsoleContext();
  const { followed } = useFollowed();
  const followCitation = useFollowCitation(answerId, citations);

  return (
    <ul aria-label="Citations" className="flex flex-wrap gap-1.5">
      {citations.map(({ citation, resolution }, i) => {
        const label = resolution.ok
          ? resolution.target.label
          : citation.label || "Unresolved source";
        return (
          <li key={i}>
            <CitationChip
              id={chipId(answerId, i)}
              index={i}
              label={label}
              resolved={resolution}
              pressed={isLatest && followed?.answerId === answerId && ctx.cite === i}
              disagreement={
                resolution.ok && resolution.disagreement
                  ? {
                      assistant: resolution.disagreement.assistant,
                      source: resolution.disagreement.source.replace("_", " "),
                    }
                  : undefined
              }
              onFollow={() => followCitation(i)}
            />
          </li>
        );
      })}
    </ul>
  );
}
