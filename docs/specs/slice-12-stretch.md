# Slice 12: Stretch items. Spec

Three independent sub-slices, built in this order only if the core (0 to 11) is green and deployed. Inputs: user-flows.md slice 12; architecture.md §10.

## 12a. Virtualised facts table
- `src/features/analyst/FactsTable.tsx` with `@tanstack/react-virtual`: a semantic `<table>` whose `<tbody>` renders only visible rows inside a 600 px scroll container (`role="region"` labelled "All facts", focusable); columns Market, Product, Period (mono), Actual, Forecast, Prior year, Units, Attainment; rows filtered by Context (entity scope; all periods), sorted by Period desc then Market then Product by default; sortable headers (`aria-sort`, click or Enter toggles asc/desc, one column at a time); caption `${shown} of 1,560 facts`; `Copy as CSV` ghost button writing the shown rows to the clipboard (`navigator.clipboard.writeText`, with a visually hidden status "Copied 120 rows").
- Opened by a ghost button `All facts` in the Analyst toolbar which sets `facts=1` (replace history); closed by `Hide facts`.
- Tests: `src/features/analyst/FactsTable.stories.tsx` story `AllFacts` (1,560 rows from the dataset decorator, 600 px tall); play: fewer than 40 `<tr>` in the DOM; scrolling to the end shows `2026-05 · Mexico · Zephyra`; sort by Attainment twice → descending with `aria-sort`. `tests/e2e/slice12a.spec.ts` (Context market=de → caption "120 of 1,560 facts").

## 12b. Command palette
- `src/features/palette/CommandPalette.tsx` with shadcn `Command` (cmdk), lazy-loaded; opened by Ctrl-K / Cmd-K and a header ghost button `⌘K` labelled "Open command palette"; groups: Markets (13, "Go to {name}"), Regions (4), Products (5, only when a market is selected: "Select {product}"), Views ("Switch to Overview/Analyst"), Ask (the three example questions, "Ask: …", which prefill and send), Theme ("Toggle theme"). Selecting navigates via `setContext` or calls the assistant.
- Tests: `src/features/palette/CommandPalette.stories.tsx` story `Open`; play: lists the groups and item counts. `tests/e2e/slice12b.spec.ts` (Ctrl-K focuses the input; typing "germ" + Enter → `market=de`).

## 12c. Removed

Storybook moved into the foundation (slice 0 §10.0) on 2026-11-02; there is no separate Storybook slice. The deployed Storybook URL and the a11y-addon coverage are reported with slice 11.
