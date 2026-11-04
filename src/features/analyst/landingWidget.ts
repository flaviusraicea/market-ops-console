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
