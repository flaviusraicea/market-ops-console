# Slice 9: Ask why from the dashboard. Spec

Depends on slices 4 and 5. Inputs: preview-spec.md §9.4 prefill texts; user-flows.md slice 9.

## 1. Files
- `features/assistant/useAskWhy.ts`: `prefillFor(market: Market): string` → Germany (any market with a `dip` anomaly) → `Why did ${name}'s revenue dip?`; otherwise `Why is ${name} ${STATUS_LABEL[status].toLowerCase()}?`. `prefill(text)` sets the composer value, focuses it, and scrolls the panel into view below 1024 px. It does **not** send.
- Wire `AskWhy` buttons in TopMovers (slice 2) and MarketGrid (slice 4) to it; `aria-label` = `Ask why ${name} ${verbPhrase}` where verbPhrase is `dipped` for the dip case, else `is ${status label lowercase}`.

## 2. Tests first
- `tests/unit/askWhy.test.ts`: Germany → "Why did Germany's revenue dip?"; Spain → "Why is Spain off track?"; China → "Why is China on track?".
- `tests/e2e/slice9.spec.ts`: the two criteria from user-flows.md slice 9 verbatim, plus: pressing Enter in the prefilled composer sends and the Germany answer arrives.
