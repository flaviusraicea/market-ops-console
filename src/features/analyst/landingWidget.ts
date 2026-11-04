import type { Mode, ResolvedTarget } from "@/domain";

/** The one widget a citation lands on: it gets the ring, and it is where the page scrolls. */
export type LandingWidget = "timeseries" | "productRow" | "gridSection" | "regionRow" | "kpiTile";

/**
 * A claim about a month lands on the chart that plots it; one without a month lands on the widget that holds the
 * entity: a product row, the markets grid section (a market or, in Analyst, a region), a region row on the Overview,
 * or the KPI tile for the portfolio.
 */
export function landingWidget(target: ResolvedTarget, mode: Mode): LandingWidget {
  if (!target.periodDefaulted) return "timeseries";
  switch (target.entity.kind) {
    case "product":
      return "productRow";
    case "market":
      return "gridSection";
    case "region":
      return mode === "analyst" ? "gridSection" : "regionRow";
    case "portfolio":
      return "kpiTile";
  }
}
