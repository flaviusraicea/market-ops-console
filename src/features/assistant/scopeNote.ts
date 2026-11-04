import { entityName, type Dataset, type Entity } from "@/domain";
import { askedLabel, list, marketsNamed } from "@/lib/stream/askedScope";
import type { Answer } from "./useAnswerMachine";

/** The market an entity sits in, or its region; undefined for the portfolio. */
function marketOf(e: Entity): string | undefined {
  return e.kind === "market" || e.kind === "product" ? e.marketId : undefined;
}

/** Whether an answer about `cited` is about the view `asked` (the same thing, or something inside it). */
function within(ds: Dataset, cited: Entity, asked: Entity): boolean {
  switch (asked.kind) {
    case "portfolio":
      return true;
    case "region": {
      if (cited.kind === "region") return cited.regionId === asked.regionId;
      const market = marketOf(cited);
      return ds.markets.some((m) => m.id === market && m.regionId === asked.regionId);
    }
    case "market":
      return marketOf(cited) === asked.marketId;
    case "product":
      return (
        cited.kind === "product" &&
        cited.marketId === asked.marketId &&
        cited.productId === asked.productId
      );
  }
}

/**
 * What the card says when a finished answer covers more than the view it was asked from: the canned answers are
 * fixed text (the starter pack's), so instead of presenting a market's figure as the filtered one, the card names
 * the answer's real scope. Undefined when the answer is about the view, cites one other named place (the question
 * asked about it), or abstains.
 */
export function scopeNote(ds: Dataset, answer: Answer): string | undefined {
  const asked = answer.context?.entity;
  if (answer.status !== "done" || !asked || asked.kind === "portfolio") return undefined;
  if (answer.kind === "abstain") return undefined;
  const viewName = entityName(ds, asked);
  const cited = answer.citations.flatMap((c) =>
    c.resolution.ok ? [c.resolution.target.entity] : [],
  );
  if (cited.length === 0) return `Covers the whole portfolio, not ${viewName}`;
  if (cited.some((e) => within(ds, e, asked))) return undefined;
  if (
    asked.kind === "product" &&
    cited.some((e) => e.kind === "market" && e.marketId === asked.marketId)
  ) {
    const product = ds.products.find((p) => p.id === asked.productId)?.name ?? asked.productId;
    const market = ds.markets.find((m) => m.id === asked.marketId)?.name ?? asked.marketId;
    return `Covers all products in ${market}, not just ${product}`;
  }
  const places = new Set(cited.map((e) => marketOf(e) ?? (e.kind === "region" ? e.regionId : "")));
  return places.size > 1 ? `Covers the whole portfolio, not ${viewName}` : undefined;
}

/**
 * A question that names several markets and an answer that covers only some of them: the label narrows to the
 * markets answered and the note says which were not compared. Undefined when the answer covers all it was asked
 * about, or cites none of them (an abstain).
 */
export function answeredMarkets(
  ds: Dataset,
  answer: Answer,
): { label: string | undefined; note: string } | undefined {
  if (answer.status !== "done" || answer.kind === "abstain") return undefined;
  const named = marketsNamed(ds, answer.question);
  if (named.length < 2) return undefined;
  const cited = new Set(
    answer.citations.flatMap((c) => {
      if (!c.resolution.ok) return [];
      return [marketOf(c.resolution.target.entity) ?? ""];
    }),
  );
  const answered = named.filter((m) => cited.has(m.id));
  if (answered.length === 0 || answered.length === named.length) return undefined;
  const missing = named.filter((m) => !cited.has(m.id));
  return {
    label: askedLabel(
      ds,
      answer.question,
      answer.context,
      answered.map((m) => m.id),
    ),
    note: `Covers ${list(answered.map((m) => m.name))}; ${list(missing.map((m) => m.name))} not compared`,
  };
}
