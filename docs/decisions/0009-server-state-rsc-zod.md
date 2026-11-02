# 0009. Server state through server components and zod

Status: accepted, decided on 2026-11-02.

## Context

`data.json` is static and is the source of truth; the console must fail loudly if it is malformed.

## Options

- Fetch it on the client with TanStack Query.
- Parse it once on the server with a zod schema and pure selectors.

## Decision

Server loader with `DatasetSchema`; selectors are pure functions in `domain/`. A failure fails the build, not the page.

## Consequences

No client fetch of a static file. The data contract is the semantic layer.
