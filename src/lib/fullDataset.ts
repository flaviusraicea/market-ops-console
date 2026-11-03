import raw from "@/data/data.json";
import { type Dataset } from "@/domain";
import { parseDataset } from "@/domain/dataset";

/**
 * The whole dataset, series included, for the browser. Only the lazily loaded live-mode chunk imports this
 * file, so nothing reaches the first load until someone turns Live on.
 */
export function loadFullDataset(): Dataset {
  return parseDataset(raw);
}
