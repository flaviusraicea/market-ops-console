# 0015. The header ignores density

Status: accepted, decided on 2026-11-04.

## Context

`data-density` lives on `<html>`, so the header inherited the Analyst overrides: controls shrank from 36 to 28 px and the cluster tightened when switching modes.

## Decision

Density applies to the data surface only. `.app-header` re-declares the Executive values (`--control-h`, `--chip-h`, `--text-body`, `--text-body-lh`, `--gap`, `--space-unit`), so the header is identical in both modes. `data-density` stays on `<html>` so portalled popovers keep it. Touch sizes (44 px) still apply.

## Consequences

One rule, no markup churn. Moving the attribute to `<main>` was rejected: popovers portal out of it and would lose density.
