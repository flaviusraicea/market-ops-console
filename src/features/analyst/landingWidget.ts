import type { ResolvedTarget } from "@/domain";

/** The one widget a citation lands on: it gets the ring, and it is where the page scrolls. */
export type LandingWidget = "timeseries" | "productRow" | "gridSection" | "kpiTile";

/**
 * A claim about a month lands on the chart that plots it; one without a month lands on the widget that holds the
 * entity: a product row, the markets grid section (a market or a region), or the KPI strip for the portfolio.
 * Following a citation always opens Analyst (targetToContext), so there is no Overview widget to name.
 */
export function landingWidget(target: ResolvedTarget): LandingWidget {
  if (!target.periodDefaulted) return "timeseries";
  switch (target.entity.kind) {
    case "product":
      return "productRow";
    case "market":
    case "region":
      return "gridSection";
    case "portfolio":
      return "kpiTile";
  }
}

const GAP = 16;

/**
 * The scroll position that centres a widget in the visible area, between the sticky toolbar's bottom edge and the
 * viewport bottom. A widget taller than that area aligns its top `GAP` below the toolbar instead.
 * `scrollIntoView({ block: "center" })` would centre against the whole window, behind the toolbar.
 */
export function centredScrollTop({
  targetTop,
  targetHeight,
  scrollY,
  toolbarBottom,
  viewportHeight,
}: {
  /** The widget's `getBoundingClientRect().top`. */
  targetTop: number;
  targetHeight: number;
  scrollY: number;
  toolbarBottom: number;
  viewportHeight: number;
}): number {
  const avail = viewportHeight - toolbarBottom;
  const offset = targetHeight > avail ? GAP : (avail - targetHeight) / 2;
  return Math.max(0, targetTop + scrollY - toolbarBottom - offset);
}
