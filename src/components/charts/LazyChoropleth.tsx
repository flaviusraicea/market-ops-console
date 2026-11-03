"use client";

import { lazy, Suspense, type ComponentProps } from "react";

import { Skeleton } from "@/components/ui/skeleton";

// d3-geo and the visx map pieces (about 10 KB gzipped) load only once the geometry is ready, so the map is
// never part of the first bundle.
const Choropleth = lazy(() => import("./Choropleth").then((m) => ({ default: m.Choropleth })));

/**
 * The placeholder for the map: the same box the chart will fill. With a fixed `height` it is that tall;
 * without one it follows the chart's clamped 0.52 aspect ratio (Choropleth.tsx), so the swap shifts nothing.
 */
export function MapSkeleton({ height }: { height?: number | undefined }) {
  return height ? (
    <Skeleton aria-hidden style={{ height }} className="w-full" />
  ) : (
    <Skeleton aria-hidden className="aspect-[100/52] max-h-[420px] min-h-[220px] w-full" />
  );
}

export function LazyChoropleth(props: ComponentProps<typeof Choropleth>) {
  return (
    <Suspense fallback={<MapSkeleton height={props.height} />}>
      <Choropleth {...props} />
    </Suspense>
  );
}
