# 0003. URL as navigation state with nuqs

Status: accepted, decided on 2026-11-02.

## Context

Drill path, period, mode, metric and the open citation must survive a reload, be shareable and work with back and forward.

## Options

- A hand-rolled `useSearchParams` wrapper.
- nuqs typed parsers.
- A client store synced to the URL.

## Decision

nuqs, behind one hook (`useConsoleContext`) that is the only writer and applies the invariants (market implies region, product needs a market).

## Consequences

Typed, server-readable params and history for free. Widgets never hold a copy of navigation state.
