# Slice 6: Follow a citation. Spec

Depends on slices 3 and 5. Inputs: design-system.md §6.5 (chips), domain-model.md §6; architecture.md §5 (`cite`); user-flows.md slice 6.

## 1. Files
- `ui/components/CitationChip.tsx`: props `{ label, resolved: Resolution, pressed, onFollow, index }`; `<button aria-label={`Go to ${label}`} aria-pressed={pressed}>` with `link-2` 12 px; unresolved: dashed border (`border-style: dashed`), `--ink-muted` text, `aria-describedby` → hidden "Could not resolve this citation", and `onFollow` disabled; disagreement variant (slice 7) adds the warning icon, built now behind a prop.
- `features/assistant/CitationRow.tsx`: renders chips in citation order; `onFollow(i)` → `setContext({ ...targetToContext(resolved.target), cite: i }, { history: "push" })` where `targetToContext` maps entity to region/market/product and sets `period` (the resolved period, defaulted → latest). The chip is pressed when `ctx.cite === i` and the answer is the latest answer.
- Inline citations: the answer text is rendered through `renderWithCitations(text, citations)` which wraps the phrases listed per fixture in `features/assistant/inlineMap.ts` (a map from fixture id → array of `{phrase, citationIndex}` exactly as preview-spec.md §9.4; match the first occurrence; fixture id is not in the SSE payload, so the map is keyed by the `done.citations` labels joined with `|`, which is unique per fixture). Each wrapped phrase is an `<a href="#chip-{answerId}-{i}" class="cite-inline">` that focuses the chip on click.
- Landing: when `ctx.cite` is set and the page renders, the target widget gets a `data-landed` attribute for 2 s (accent ring) and, for a period target, the time series opens its tooltip at that period and scrolls into view (`scrollIntoView({block:"center"})`, respecting reduced motion with `behavior:"auto"`); for a market target without period change the grid row is selected. Implement in a `useLanding()` hook in `features/analyst` reading `ctx.cite` and the latest answer's resolved citations from a small `AnswerStore` context exposed by Panel.
- `cite` is cleared on any other navigation per the context rules (already in slice 0; verify).

## 2. Tests first
- `tests/unit/targetToContext.test.ts`: product target → `{region:"eu", market:"de", product:"veltrix", period:"2026-03"}`; region target → `{region:"apac", market: undefined, product: undefined, period:"2026-05"}`.
- `ui/components/CitationChip.stories.tsx`: stories `Resolved`, `Pressed`, `Unresolved`, `Disagreement` (the slice 7 variant, rendered now behind the prop) with `onFollow: fn()`. Play: resolved chip name "Go to Germany, Mar 2026 (largest dip)" and clicking calls `onFollow`; unresolved chip is disabled with the hidden description; `Pressed` has `aria-pressed="true"`. A11y addon passes.
- `tests/unit/inlineMap.test.ts`: Germany-dip text renders three `cite-inline` anchors wrapping `early 2026`, `steepest drop in March`, `across the product portfolio`.
- `tests/e2e/slice6.spec.ts`: the four criteria from user-flows.md slice 6 verbatim.

## 3. Done when
Green; recording of chip → chart landing attached.
