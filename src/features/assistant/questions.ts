import type { Entity, Period } from "@/domain";
import { formatPeriodAbbr } from "@/lib/format";
import type { AskContext } from "./askWhy";

/** Month-on-month fall that makes a question say "dip" rather than "change". */
const DIP_PCT = -10;

/** "Germany · Mar 2026": the place and month a question was asked from. */
export function askLabel(name: string, period: string): string {
  return `${name} · ${formatPeriodAbbr(period)}`;
}

/** The question a heat map cell or anomaly marker fills in: `Why did Germany's revenue dip in Mar 2026?` */
export function cellQuestion(name: string, period: string, momPct: number | undefined): string {
  const word = momPct !== undefined && momPct <= DIP_PCT ? "dip" : "change";
  return `Why did ${name}'s revenue ${word} in ${formatPeriodAbbr(period)}?`;
}

/** The ask context for a question about one entity in one month. */
export function askContext(entity: Entity, name: string, period: Period): AskContext {
  return { entity, period, label: askLabel(name, period) };
}
