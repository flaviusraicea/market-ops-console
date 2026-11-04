# 0013. Performance budgets enforced in CI

Status: accepted, decided on 2026-11-03. Amended on 2026-11-04: the Analyst budget is 300 KB (see Consequences).

## Context

The brief scores performance and observability. A budget written in a document drifts; one that fails a pull request does not. The console has two depths in one route: Overview is the cold open, Analyst is the working view.

## Options

- One number for the whole page, which would force Analyst inside the Overview budget.
- A budget per view, measured from what the browser receives, and checked in CI.

## Decision

Budgets per view, in `package.json` under `budgets`, gzipped: Overview scripts 250 KB, Analyst scripts including Overview's 350 KB, any single lazy chunk 60 KB, fonts 110 KB, CSS 20 KB. `pnpm check:budget` (in `pnpm ci` after the build) starts the production server, loads both views in headless Chromium and adds up the compressed bytes of each script, stylesheet and font it received. Lighthouse CI asserts the Core Web Vitals on the same two URLs as errors: performance at least 0.9, LCP at most 2.5 s, CLS at most 0.1, TBT at most 200 ms, accessibility at least 0.95.

The check measures the browser rather than adding up the bundler's report because the bundler groups every client component of a route as "first load", including the Analyst ones Overview never renders, and it overstates Overview by about 50 KB. `next analyze` is still how to see where the bytes come from.

## Consequences

A change that adds a dependency to the first load fails the pull request with a table, before review. The check needs a Chromium, which the CI job already installs for the end-to-end tests. Lighthouse counts response headers in its script size, so its limits are the budgets plus about 10 KB.

Amendment, 2026-11-04: the Alerts form (zod, react-hook-form, TanStack Query) now loads only when the folded Alerts section is opened. That took 59 KB out of the Analyst load, so its budget drops from 350 KB to 300 KB to hold the saving.
