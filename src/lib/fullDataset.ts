import raw from "@/data/data.json";
import { parseDataset, type Dataset } from "@/domain";

/**
 * The whole dataset, series included, for the browser. Only the lazily loaded live-mode chunk imports this
 * file, so nothing reaches the first load until someone turns Live on.
 */
export function loadFullDataset(): Dataset {
  return parseDataset(raw);
}
