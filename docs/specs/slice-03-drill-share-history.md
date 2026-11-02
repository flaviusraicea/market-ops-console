# Slice 3: Drill down, share, back and forward. Spec

Depends on slices 0 to 2. Inputs: user-flows.md slice 3; architecture.md §5; design-system.md §6.1.

## 1. Outcome
Every navigation writes Context through `setContext`, the server page re-renders from the URL, breadcrumbs and chips reflect it, and history works. A product selector appears when a market is selected.

## 2. Files
- `src/features/shell/ProductSelect.tsx` (client): shadcn Select labelled "Product", options "All products" + the five products, shown in the header only when `ctx.market` is set; writes `setContext({product})` or clears it.
- `src/features/shell/Header.tsx`: one fixed row from 1024 px up (never wraps; below 1024 px it may wrap). The wordmark and right-hand controls (Product, Period, data stamp, mode switch, theme toggle) never shrink or wrap; the breadcrumb takes the remaining width and truncates with an ellipsis, each crumb carrying a `title` with its full name. Header height is identical at the portfolio and at Germany · Veltrix.
- `src/features/shell/Breadcrumbs.tsx`: crumbs from `breadcrumbTrail`; each non-current crumb is a `<Link href>` built by `hrefFor(partialCtx)` (a helper in `src/lib/context` that serialises a Context to a URL with the same parsers) so they are real links (middle-click works) and also call `setContext` on click for client navigation.
- `src/features/shell/ContextChips.tsx`: `Period: May 2026 ×` (clear → latest), hidden when period is latest. There is no product chip: the Product select ("All products" clears it) and the last breadcrumb already show it.
- `src/lib/context/useConsoleContext.ts`: implement `history` semantics exactly as architecture.md §5; use nuqs `shallow: false` so the server component re-renders with the new searchParams; `startTransition` around writes; expose `isPending` for a 2 px progress bar under the header (`--accent`, visible while pending, `aria-hidden`).
- `src/features/overview/Overview.tsx`: the title row above the tiles reads `entityName` as `--text-title` plus a caption `${formatPeriod(period)} · ${basisLabel}`; the map keeps all 13 markets but highlights the selected one and the markets of the selected region (others at 60 % opacity via a `data-dim` attribute, never below 3:1 for the stroke).
- `src/app/page.tsx`: `export const dynamic = "force-dynamic"` is **not** needed; searchParams already opt the page into dynamic rendering. Ensure `generateMetadata` sets `<title>` to `${entityName} · ${formatPeriod(period)} · Market Ops`.

## 3. Tests first
- `tests/unit/href.test.ts`: `hrefFor({region:"eu", market:"de", period:"2026-03", mode:"analyst"})` → `/?region=eu&market=de&period=2026-03&mode=analyst` (defaults omitted; key order fixed as region, market, product, period, mode, metric, basis, cite, facts).
- `src/features/shell/Breadcrumbs.stories.tsx` (extend the slice 0 Header stories file if the component is only rendered there): story `Germany`. Play: three items, the first two as links with the right hrefs, the last with `aria-current="page"`.
- `tests/e2e/slice3.spec.ts`: exactly the six E2E criteria from user-flows.md slice 3 (map click → URL and breadcrumb and `$1.68M`; Veltrix select → `product=veltrix` and document title contains "Germany · Veltrix"; deep link renders all state; Back ×2 and Forward; Portfolio breadcrumb keeps `mode=analyst`; plus: the period chip appears when period ≠ latest and clearing it removes `period` from the URL; plus a 1440 px check that the header height is the same at the portfolio and at Germany · Veltrix and its controls share one row).

## 4. Done when
Green; a short screen recording or three screenshots (portfolio, Germany, Germany · Veltrix · Mar 2026) in the report.
