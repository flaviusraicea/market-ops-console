# 0010. Forms with react-hook-form and zod

Status: accepted, decided on 2026-11-02.

## Context

The alert thresholds form needs inline validation shared with the server.

## Options

- Native form with zod on submit.
- react-hook-form with the zod schema and shadcn Form primitives.

## Decision

react-hook-form with `AlertRuleSchema`, shared by the form, the route handler and the mutation.

## Consequences

One schema end to end. A "Simulate failure" switch in Analyst mode demonstrates rollback.
