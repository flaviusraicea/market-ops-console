# Slice 8: Low confidence, abstain, error. Spec

Depends on slice 7. Inputs: design-system.md §6.5 states 3, 4, 7, §6.12; domain-model.md §7; user-flows.md slice 8.

## 1. Files
- `AnswerCard` kinds: `low_confidence` → full render with Low meter (already by confidence); `abstain` → no chips, no meter; footer-left pill `Can't answer from this data` (`circle-slash` 12 px); under the text: line `Data covers Jun 2024 to May 2026.` (from `meta.periods` first/last via `formatPeriod`) and a ghost button `Try: "Which markets are at risk?"` which prefills the composer (does not send). `kind === "error"` never reaches done (the route emits an `error` event) → machine `failed` → the card is replaced by the `Notice` (ui/primitives) with title `Request failed`, body `The assistant could not answer. Nothing was changed.`, secondary `Retry`; the question echo stays above. If tokens had arrived before the error (not possible with the reference route, but handle it): keep the partial text with the pill and show the Notice beneath.
- Default fixture (unmatched questions) renders as a normal low-confidence answer with its citations.
- `features/assistant/Panel.tsx`: pass `prefill` for the Try button.

## 2. Tests first
- Add stories `Abstain` and `Failed` to `features/assistant/AnswerCard.stories.tsx`. Play on `Abstain`: the pill, the coverage line with "Jun 2024 to May 2026", the Try button, and no chip or meter. Play on `Failed`: a `role="alert"` with the exact title and body and a Retry button that calls `onRetry`. `ui/components/Notice.stories.tsx`: `Error`, `Warning`, `Info` states from design-system.md §6.12 (a11y addon only).
- `tests/e2e/slice8.spec.ts`: the four criteria from user-flows.md slice 8 verbatim (the "force error" message from the route is not displayed verbatim; our Notice body is fixed, and the route's message is logged via `logEvent`).
