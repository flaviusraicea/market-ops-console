import type { ReactNode } from "react";

import { chipId } from "./CitationRow";
import { segmentText } from "./inlineMap";
import type { Resolved } from "./useAnswerMachine";

/** Wraps the phrases that stand for a citation in anchors that move focus to that citation's chip. */
export function renderWithCitations(
  text: string,
  citations: readonly Resolved[],
  answerId: string,
): ReactNode[] {
  return segmentText(
    text,
    citations.map((c) => c.citation),
  ).map((seg, n) => {
    const i = seg.citationIndex;
    if (i === undefined || !citations[i]?.resolution.ok) return seg.text;
    const id = chipId(answerId, i);
    return (
      <a
        key={n}
        href={`#${id}`}
        className="cite-inline"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById(id)?.focus();
        }}
      >
        {seg.text}
      </a>
    );
  });
}
