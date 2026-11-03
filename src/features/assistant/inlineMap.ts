import type { Citation } from "@/domain";
import type { SourcesMeta } from "./sourcesRows";

export type InlinePhrase = { phrase: string; citationIndex: number };

/**
 * Words in an answer that stand for one of its citations (preview-spec 9.4). The stream's `done` event carries no
 * fixture id, so a fixture is recognised by its citation labels joined with "|", which is unique per fixture.
 */
/** The Europe at-risk answer's citation labels, which is how `inlineKey` recognises it. */
const EUROPE_AT_RISK = ["Germany", "Spain", "Italy", "United Kingdom", "France"]
  .map((n) => `${n}, latest period`)
  .join("|");

const AT_RISK = [
  "Germany, latest period",
  "Germany, March dip",
  "Spain, latest period",
  "Italy, latest period",
  "United Kingdom, latest period",
  "France, latest period",
  "Brazil, latest period",
].join("|");
const FORECAST_MISS = "Portfolio, May 2026|Germany|Italy|United Kingdom|APAC";
const APAC_VS_EUROPE = "APAC, latest period|Europe, latest period|China|Japan|Germany|Italy";

export const INLINE_MAP: Readonly<Record<string, readonly InlinePhrase[]>> = {
  "Germany, Feb 2026|Germany, Mar 2026 (largest dip)|Veltrix in Germany, Mar 2026": [
    { phrase: "early 2026", citationIndex: 0 },
    { phrase: "steepest drop in March", citationIndex: 1 },
    { phrase: "across the product portfolio", citationIndex: 2 },
  ],
  [AT_RISK]: [
    { phrase: "Germany", citationIndex: 0 },
    { phrase: "sharp dip in March", citationIndex: 1 },
    { phrase: "Spain", citationIndex: 2 },
    { phrase: "Italy", citationIndex: 3 },
    { phrase: "United Kingdom", citationIndex: 4 },
    { phrase: "France", citationIndex: 5 },
    { phrase: "Brazil", citationIndex: 6 },
  ],
  [EUROPE_AT_RISK]: [
    { phrase: "Germany", citationIndex: 0 },
    { phrase: "Spain", citationIndex: 1 },
    { phrase: "Italy", citationIndex: 2 },
    { phrase: "United Kingdom", citationIndex: 3 },
    { phrase: "France", citationIndex: 4 },
  ],
  [FORECAST_MISS]: [
    { phrase: "100.4% of forecast in May 2026", citationIndex: 0 },
    { phrase: "Germany", citationIndex: 1 },
    { phrase: "Italy", citationIndex: 2 },
    { phrase: "United Kingdom", citationIndex: 3 },
    { phrase: "APAC", citationIndex: 4 },
  ],
  [APAC_VS_EUROPE]: [
    { phrase: "up 11.5% year on year and sits at 104.9% of forecast", citationIndex: 0 },
    { phrase: "1.7% growth and 95.4% for Europe", citationIndex: 1 },
    { phrase: "China", citationIndex: 2 },
    { phrase: "Japan", citationIndex: 3 },
    { phrase: "Germany", citationIndex: 4 },
    { phrase: "Italy", citationIndex: 5 },
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
  [AT_RISK]: {
    items: [
      { claim: "Germany at risk", assistantWord: "At risk" },
      { claim: "March dip", assistantWord: "Sharp dip" },
      { claim: "Spain off track", assistantWord: "Off track" },
      { claim: "Italy at risk", assistantWord: "At risk" },
      { claim: "United Kingdom at risk", assistantWord: "At risk" },
      { claim: "France at risk", assistantWord: "At risk" },
      { claim: "Brazil at risk", assistantWord: "At risk" },
    ],
  },
  [EUROPE_AT_RISK]: {
    items: [
      { claim: "Germany off track", assistantWord: "Off track" },
      { claim: "Spain off track", assistantWord: "Off track" },
      { claim: "Italy at risk", assistantWord: "At risk" },
      { claim: "United Kingdom at risk", assistantWord: "At risk" },
      { claim: "France at risk", assistantWord: "At risk" },
    ],
  },
  [FORECAST_MISS]: {
    withRevenue: true,
    items: [
      { claim: "Portfolio on forecast", assistantWord: "100.4% of forecast" },
      { claim: "Furthest under plan", assistantWord: "92.0%" },
      { claim: "Furthest under plan", assistantWord: "93.0%" },
      { claim: "Furthest under plan", assistantWord: "94.3%" },
      { claim: "Ahead of plan", assistantWord: "104.9%" },
    ],
  },
  [APAC_VS_EUROPE]: {
    items: [
      { claim: "APAC growth and attainment", assistantWord: "+11.5% · 104.9%" },
      { claim: "Europe growth and attainment", assistantWord: "+1.7% · 95.4%" },
      { claim: "Leads APAC", assistantWord: "Leads APAC" },
      { claim: "Leads APAC", assistantWord: "Leads APAC" },
      { claim: "Furthest under plan", assistantWord: "Under plan" },
      { claim: "Furthest under plan", assistantWord: "Under plan" },
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
