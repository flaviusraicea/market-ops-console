import type { Citation } from "@/domain";

export type InlinePhrase = { phrase: string; citationIndex: number };

/**
 * Words in an answer that stand for one of its citations (preview-spec 9.4). The stream's `done` event carries no
 * fixture id, so a fixture is recognised by its citation labels joined with "|", which is unique per fixture.
 */
export const INLINE_MAP: Readonly<Record<string, readonly InlinePhrase[]>> = {
  "Germany, Feb 2026|Germany, Mar 2026 (largest dip)|Veltrix in Germany, Mar 2026": [
    { phrase: "early 2026", citationIndex: 0 },
    { phrase: "steepest drop in March", citationIndex: 1 },
    { phrase: "across the product portfolio", citationIndex: 2 },
  ],
  "Germany, latest period|Germany, March dip|Italy, latest period|Brazil, latest period": [
    { phrase: "Germany", citationIndex: 0 },
    { phrase: "sharp dip in March", citationIndex: 1 },
    { phrase: "Italy", citationIndex: 2 },
    { phrase: "Brazil", citationIndex: 3 },
  ],
  "Germany|Italy|Brazil": [
    { phrase: "Germany", citationIndex: 0 },
    { phrase: "Italy", citationIndex: 1 },
    { phrase: "Brazil", citationIndex: 2 },
  ],
};

export function inlineKey(citations: readonly Pick<Citation, "label">[]): string {
  return citations.map((c) => c.label ?? "").join("|");
}

export type Segment = { text: string; citationIndex?: number };

/** Splits text into plain and cited segments. Each phrase matches its first occurrence; overlapping matches are dropped. */
export function segmentText(
  text: string,
  citations: readonly Pick<Citation, "label">[],
): Segment[] {
  const phrases = INLINE_MAP[inlineKey(citations)] ?? [];
  const hits = phrases
    .map((p) => ({ ...p, at: text.indexOf(p.phrase) }))
    .filter((h) => h.at >= 0)
    .sort((a, b) => a.at - b.at);
  const out: Segment[] = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.at < cursor) continue;
    if (h.at > cursor) out.push({ text: text.slice(cursor, h.at) });
    out.push({ text: h.phrase, citationIndex: h.citationIndex });
    cursor = h.at + h.phrase.length;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) });
  return out;
}
