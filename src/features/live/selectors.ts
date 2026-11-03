import type { Context as Cx, Dataset as Ds } from "@/domain";
import type { LiveEngine as Engine } from "./engine";

// Selectors shared by the Overview and Analyst wrappers. Module-level, so each is a stable reference for
// useLiveVM; the engine is a type-only import, so this file adds nothing to the first load.
export const tiles = (e: Engine, ds: Ds, cx: Cx) => e.overview(ds, cx).tiles;
export const map = (e: Engine, ds: Ds, cx: Cx) => e.overview(ds, cx).map;
export const regionBars = (e: Engine, ds: Ds, cx: Cx) => e.regionBars(ds, cx);
