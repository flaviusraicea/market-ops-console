import type { Market, Status } from "./dataset";

export const STATUS_RULE_TEXT =
  "Status is given in the data. It is consistent with: off track when growth is negative or attainment is below about 92.5%; at risk when attainment is below 100%; on track otherwise.";

export const STATUS_LABEL: Record<Status, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};

const hasDip = (market: Market) => market.kpis.anomalies.some((a) => a.type === "dip");

/** The question an "Ask why" button puts in the composer. Single source for every button. Never sent for the user. */
export function prefillFor(market: Market): string {
  if (hasDip(market)) return `Why did ${market.name}'s revenue dip?`;
  return `Why is ${market.name} ${STATUS_LABEL[market.kpis.status].toLowerCase()}?`;
}

/** The button's text and accessible name, built from the same rule as the question. */
export function askWhyPrompt(market: Market): { aria: string; text: string } {
  const aria = hasDip(market)
    ? `Ask why ${market.name} dipped`
    : `Ask why ${market.name} is ${STATUS_LABEL[market.kpis.status].toLowerCase()}`;
  return { aria, text: prefillFor(market) };
}
