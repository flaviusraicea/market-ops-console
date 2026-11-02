# 0011. Testing stack

Status: accepted, decided on 2026-11-02.

## Context

Tests should be fast, standard and CI-friendly, and cover logic, components, journeys and tokens.

## Options

- Jest.
- Vitest, Storybook stories, Playwright with axe, and a contrast script.

## Decision

Vitest for domain and library code, Storybook for components, Playwright with axe for journeys in both themes, and `scripts/check-contrast.ts` as a CI gate.

## Consequences

Each layer of the pyramid has one tool. Accessibility is checked at component and page level.
