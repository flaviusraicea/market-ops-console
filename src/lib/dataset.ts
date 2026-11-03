import raw from "@/data/data.json";
import { type Dataset } from "@/domain";
import { parseDataset } from "@/domain/dataset";

let parsed: Dataset | undefined;

/** Validates data.json once per server process. A failure surfaces at build time, not as a broken page. */
export function getDataset(): Dataset {
  parsed ??= parseDataset(raw);
  return parsed;
}
