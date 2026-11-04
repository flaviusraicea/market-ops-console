# 0009. Server state through server components and zod

Status: accepted, decided on 2026-11-02.

## Context

`data.json` is static and is the source of truth; the console must fail loudly if it is malformed.

## Options

- Fetch it on the client with TanStack Query.
- Parse it once on the server with a zod schema and pure selectors.

## Decision

Server loader with `DatasetSchema`; selectors are pure functions in `domain/`. The file is parsed once per server process, and the contract unit test (`tests/unit/contracts.test.ts`) parses the real file in CI, so a malformed `data.json` fails CI before it can reach a page.

## Consequences

No client fetch of a static file. The data contract is the semantic layer.
