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

/** Splits rendered answer nodes where the text has a blank line. A paragraph is never empty, but there is always one. */
export function splitParagraphs(nodes: ReactNode[]): ReactNode[][] {
  const paragraphs: ReactNode[][] = [[]];
  for (const node of nodes) {
    if (typeof node !== "string") {
      paragraphs[paragraphs.length - 1]?.push(node);
      continue;
    }
    node.split(/\n{2,}/).forEach((part, i) => {
      if (i > 0) paragraphs.push([]);
      if (part !== "") paragraphs[paragraphs.length - 1]?.push(part);
    });
  }
  const filled = paragraphs.filter((p) => p.length > 0);
  return filled.length > 0 ? filled : [[]];
}
