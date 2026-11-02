import type { Citation } from "@/domain";
import type { SourcesMeta } from "./sourcesRows";

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

/**
 * What the sources table says about each answer: the claim in the user's words, the assistant's own word for it, and
 * the caption (preview-spec 9.4 and its sources addendum). Same keys as INLINE_MAP.
 */
export const SOURCES_META: Readonly<Record<string, SourcesMeta>> = {
  "Germany, Feb 2026|Germany, Mar 2026 (largest dip)|Veltrix in Germany, Mar 2026": {
    items: [
      { claim: "Fell in early 2026", assistantWord: "Revenue fell" },
      { claim: "Steepest drop in March", assistantWord: "Steepest drop" },
      { claim: "Decline across the portfolio", assistantWord: "Across products" },
    ],
  },
  "Germany, latest period|Germany, March dip|Italy, latest period|Brazil, latest period": {
    items: [
      { claim: "Germany at risk", assistantWord: "At risk" },
      { claim: "March dip", assistantWord: "Sharp dip" },
      { claim: "Italy at risk", assistantWord: "At risk" },
      { claim: "Brazil at risk", assistantWord: "At risk" },
    ],
  },
  "Germany|Italy|Brazil": {
    withRevenue: true,
    items: [
      { claim: "Largest contributor", assistantWord: "Under plan" },
      { claim: "Largest contributor", assistantWord: "Under plan" },
      { claim: "Smaller drag", assistantWord: "Smaller drag" },
    ],
  },
};

export const DEFAULT_SOURCES_META: SourcesMeta = { items: [] };

/**
 * The words a status check should read for one citation: its mapped claim ("Germany at risk"), not the whole answer,
 * so a status word elsewhere in the text cannot make an unrelated chip look like a disagreement. Without a mapped
 * claim the whole text is used.
 */
export function claimTextFor(
  text: string,
  citations: readonly Pick<Citation, "label">[],
  index: number,
): string {
  return SOURCES_META[inlineKey(citations)]?.items[index]?.claim ?? text;
}

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
