# 0006. Storybook stories as the component test harness

Status: accepted, decided on 2026-11-02.

## Context

Component states need to be documented and tested in a real browser, in both themes and both densities, with accessibility checks.

## Options

- Testing Library in jsdom under `tests/component/`.
- Storybook stories with play functions run by the Vitest addon in Chromium.

## Decision

Stories with play functions, run headless by `@storybook/addon-vitest`. The a11y addon runs on every story with `test: "error"`. Pure logic stays in plain Vitest; journeys stay in Playwright.

## Consequences

One artefact is documentation, visual review and test. Costs a browser in CI. Timeboxed at one day to get green, with a fallback to Testing Library.
