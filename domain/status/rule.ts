import type { Status } from "../contracts/data";

export const STATUS_RULE_TEXT =
  "Status is given in the data. It is consistent with: off track when growth is negative or attainment is below about 92.5%; at risk when attainment is below 100%; on track otherwise.";

export const STATUS_LABEL: Record<Status, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};
