import type { Status } from "./dataset";

export const STATUS_RULE_TEXT =
  "Status is given in the data. It is consistent with: off track when growth is negative or attainment is below about 92.5%; at risk when attainment is below 100%; on track otherwise.";

export const STATUS_LABEL: Record<Status, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};

/** The question the "Ask why" affordance puts in the composer. Germany is the dataset's headline dip. */
export function askWhyPrompt(
  marketId: string,
  name: string,
  status: Status,
): { aria: string; text: string } {
  if (marketId === "de") return { aria: "Ask why Germany dipped", text: "Why did Germany dip?" };
  const label = STATUS_LABEL[status].toLowerCase();
  return { aria: `Ask why ${name} is ${label}`, text: `Why is ${name} ${label}?` };
}
