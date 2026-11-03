import { cache } from "react";

import raw from "@/data/data.json";
import { type Dataset } from "@/domain";
import { parseDataset } from "@/domain/dataset";

/** Validates data.json once per request tree. A failure surfaces at build time, not as a broken page. */
export const getDataset = cache((): Dataset => parseDataset(raw));
