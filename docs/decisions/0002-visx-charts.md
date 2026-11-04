# 0002. visx for all four charts

Status: accepted, decided on 2026-11-02.

## Context

The brief needs a time series, a radar, a choropleth map and a fourth form, all accessible, all themed by design tokens.

## Options

- Recharts: fast for line and radar, no map or heat map, limited control over the DOM.
- Nivo: all forms, heavy, own theming layer, moderate accessibility.
- ECharts: canvas, so no DOM for ARIA or keyboard.
- Plain d3 inside React: same control, two owners of the DOM.
- visx: d3 primitives rendered by React.

## Decision

visx, with d3-geo for the map (its geometry is prepared at build time by `scripts/build-geo.ts`, which is where world-atlas and topojson-client are used; neither ships to the browser). One rendering model gives one tooltip, one keyboard pattern and one "View as table".

## Consequences

More code per chart than a charting library. Every mark is an element we can label, focus and colour with `var(--series-forecast)`. Tree-shakeable.
