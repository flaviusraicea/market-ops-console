import { OverviewSkeleton } from "./OverviewSkeleton";

/** Slice 1: structure only. Slice 2 replaces the body with the KPI tiles, map and top movers. */
export function Overview() {
  return <OverviewSkeleton busy={false} />;
}
