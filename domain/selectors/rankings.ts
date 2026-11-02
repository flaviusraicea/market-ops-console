import type { Dataset, Market, Status } from "../contracts/data";
import type { Entity } from "../model/types";
import { marketsIn } from "./scope";

type Mover = { market: Market; growthPct: number };

export function topMovers(ds: Dataset, n = 3): { rising: Mover[]; falling: Mover[] } {
  const all: Mover[] = ds.markets.map((market) => ({ market, growthPct: market.kpis.growthPct }));
  return {
    rising: [...all].sort((a, b) => b.growthPct - a.growthPct).slice(0, n),
    falling: [...all].sort((a, b) => a.growthPct - b.growthPct).slice(0, n),
  };
}

export function statusCounts(ds: Dataset, entity: Entity): Record<Status, number> {
  const counts: Record<Status, number> = { on_track: 0, at_risk: 0, off_track: 0 };
  for (const m of marketsIn(ds, entity)) counts[m.kpis.status] += 1;
  return counts;
}

export function attentionCount(ds: Dataset, entity: Entity): number {
  const c = statusCounts(ds, entity);
  return c.at_risk + c.off_track;
}
