# 0001. Next.js App Router

Status: accepted, decided on 2026-11-02.

## Context

The console needs a first paint that already reflects the URL, a route for the mock streaming endpoint, and a deploy target with no configuration.

## Options

- Next.js App Router with server components.
- A client-rendered SPA (Vite) with a separate API.

## Decision

Next.js App Router. `data.json` is loaded and validated once on the server; client islands receive typed view models. Route handlers host the mock assistant stream and the mock alerts endpoint, which validates, waits and can fail but stores nothing; the browser keeps the rules in `localStorage`.

## Consequences

Shared links render correctly on first paint. The server/client split is explicit in the folder layout. The streaming route needs the Node runtime, which Vercel supports by default.
