# 0015. The chrome ignores density

Status: accepted, decided on 2026-11-04; completed the same day.

## Context

`data-density` lives on `<html>`, so every control inherited the Analyst overrides: header controls shrank from 36 to 28 px and the cluster tightened when switching modes. A first fix pinned only the header; the toolbar card still shrank, and two tokens leaked even inside the header, because `--track-h` and `--composer-row` were `var()` formulas on `:root` that resolve on `<html>` in the Analyst values before the header inherits them.

## Decision

Density applies to the data surface only (tiles, tables, chart cards and their popovers). The chrome carries one attribute, `data-chrome`: the header, the toolbar card, the assistant panel column, the command palette and the menus those controls open (a menu belongs to the control that opened it). One rule at 1024 px and up restates every density token as a number (`--space-unit`, `--gap`, `--control-h`, `--track-h`, `--chip-h`, `--text-body`, `--text-body-lh`, `--composer-row`), never as a formula, so the chrome is identical in both modes. The assistant panel keeps its own in-between scale, also stated as numbers. The phone and tablet chrome below 1024 px is unchanged, and touch sizes (44 px) still apply. `tests/e2e/chrome-density.spec.ts` measures the controls in both modes at 1440 and 1024 px.

## Consequences

One attribute and one rule, no component changes. Moving `data-density` to the dashboard column was rejected: the data surface's popovers portal out of it and would lose density.
