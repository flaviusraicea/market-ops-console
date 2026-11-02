# Slice 8: Low confidence, abstain, error. Spec

Depends on slice 7. Inputs: design-system.md §6.5 states 3, 4, 7, §6.12; domain-model.md §7; user-flows.md slice 8.

## 1. Files
- `AnswerCard` kinds: `low_confidence` → full render with Low meter (already by confidence); `abstain` → no chips, no meter; footer-left pill `Can't answer from this data` (`circle-slash` 12 px); under the text: line `Data covers Jun 2024 to May 2026.` (from `meta.periods` first/last via `formatPeriodAbbr`) and a ghost button `Try: "Which markets are at risk?"` which prefills the composer (does not send). `kind === "error"` never reaches done (the route emits an `error` event) → machine `failed` → the card is replaced by the `Notice` (src/components/ui) with title `Request failed`, body `The assistant could not answer. Nothing was changed.`, secondary `Retry`; the question echo stays above. If tokens had arrived before the error (not possible with the reference route, but handle it): keep the partial text, marked with the pill `Failed · partial answer` (`circle-pause` 12 px, same style as the Stopped pill), no citations or confidence, and show the Notice beneath.
- Default fixture (unmatched questions) renders as a normal low-confidence answer with its citations.
- `src/features/assistant/Panel.tsx`: pass `prefill` for the Try button.

## 2. Tests first
- Add stories `Abstain` and `Failed` to `src/features/assistant/AnswerCard.stories.tsx`. Play on `Abstain`: the pill, the coverage line with "Jun 2024 to May 2026", the Try button, and no chip or meter. Play on `Failed`: a `role="alert"` with the exact title and body and a Retry button that calls `onRetry`. `src/components/Notice.stories.tsx`: `Error`, `Rollback` and `TitleOnly` states from design-system.md §6.12 (the design system defines a single error Notice; a11y addon only). `Panel.stories.tsx`: `FailsAfterTwoTokens` with a mocked stream that emits two tokens then an `error` event; play asserts the pill, the partial text, the alert, and no chips or meter.
- `tests/e2e/slice8.spec.ts`: the four criteria from user-flows.md slice 8 verbatim (the "force error" message from the route is not displayed verbatim; our Notice body is fixed, and the route's message is logged via `logEvent`).
