# 0005. shadcn/ui restyled onto our tokens

Status: accepted, decided on 2026-11-02.

## Context

The product needs a distinctive look (Ledger) and consistent, accessible primitives without building every control by hand.

## Options

- Use shadcn defaults.
- Build primitives from scratch.
- shadcn primitives with every colour class re-pointed at our own CSS-variable tokens.

## Decision

shadcn/ui (new-york style) with Tailwind v4. Components are copied into `src/components/ui/` and restyled through `app/tokens.css`; no shadcn default colour survives, and no raw hex exists outside `tokens.css`.

## Consequences

Radix accessibility behaviour with our visual language. A contrast script asserts every token pair in both themes.
