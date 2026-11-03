# Performance monitoring

Two tools watch performance, and they answer different questions.

## Lighthouse CI (lab data)

Runs in CI on every push and pull request (`.github/workflows/lighthouse.yml`, configured in `lighthouserc.json`). It builds the app, serves the production build with `next start`, and audits `/` and an Analyst URL with the desktop preset, three runs each, taking the median.

It measures a controlled load on a fixed machine and network: performance score, LCP, CLS, TBT, script weight and total bytes, plus the accessibility score. Because the conditions are the same every time, a change in the number is caused by a change in the code, which makes it the right tool for catching regressions before merge. The report for each run is uploaded to temporary public storage and linked in the job summary.

Assertions, all errors, on both URLs:

- Accessibility score at least 0.95.
- Performance score at least 0.9, LCP at most 2.5 s, CLS at most 0.1, TBT at most 200 ms.
- Script weight: 260 KB on Overview and 360 KB on Analyst (the budgets below plus about 10 KB of response headers, which Lighthouse counts), and total page weight under 500 KB and 600 KB.

## Vercel Speed Insights (real-user data)

`<SpeedInsights />` in the root layout reports Core Web Vitals from real visitors' browsers: LCP, CLS, INP, FCP and TTFB, split by route, device and country.

Lab data cannot see the variety of devices, networks and interaction patterns of real users, and Lighthouse cannot measure INP at all because it needs real interactions. Speed Insights shows how the app actually feels in use.

It only reports once the app is deployed on Vercel with Speed Insights enabled for the project. Locally and in CI the component does nothing. The existing `WebVitals` hook is separate and only logs in development.

## Which to use

Use Lighthouse CI to stop regressions at review time. Use Speed Insights to confirm what users experience after release. A good lab score does not guarantee good field numbers, and the reverse.

## Bundle budgets (`pnpm check:budget`)

Lighthouse says whether a page is fast; the budget says why it will stay fast. `scripts/check-budget.ts` runs after `pnpm build` in `pnpm ci`. It starts `next start`, loads Overview and the Analyst URL in headless Chromium at 1440 wide, and adds up the compressed bytes the browser received for scripts, stylesheets and fonts. Any figure over its budget in `package.json` (`budgets`) fails the run. Scripts Analyst loads that Overview does not are the lazy chunks, each limited to 60 KB.

| Measure (gzipped) | Budget | Before (main, 09cb7db; Lighthouse rows: main b30731a) | After |
|---|---|---|---|
| Overview scripts | 250 KB | 324.6 KB | 238.5 KB |
| Analyst scripts (with Overview's) | 350 KB | 324.6 KB (one bundle) | 339.1 KB |
| Largest lazy chunk | 60 KB | none | 31.0 KB |
| Fonts loaded | 110 KB | 166.6 KB | 97.1 KB |
| CSS | 20 KB | 12.4 KB | 12.6 KB |

Lighthouse (desktop preset, median of 3, production build on one CI-class machine):

| URL | Performance | LCP | CLS | TBT |
|---|---|---|---|---|
| Overview, before | 1.00 | 0.82 s | 0.001 | 0 to 5 ms |
| Overview, after | 1.00 | 0.73 to 0.75 s | 0.001 | 0 ms |
| Analyst, before | 0.95 | 0.83 to 0.85 s | 0.132 | 0 to 13 ms |
| Analyst, after | 0.99 | 0.83 to 0.86 s | 0 | 0 to 48 ms |

Analyst is heavier than before in total because its widgets are separate chunks, each carrying a little runtime of its own and sharing modules imperfectly. That is the trade: Overview, the cold open, is 86 KB lighter, and Analyst pays for its depth only when asked for.

Two pieces load on first use rather than with the page: the answer card (sources table, citations) when the first key is typed or a question is sent, and the account menu (Radix menu) on hover, focus or click of the avatar. Both were measured at about 11 KB together; together they keep the Executive load well under budget for the mobile work that follows.

### How to find a regression

1. `pnpm build && pnpm check:budget` prints the table above and the lazy chunks by size. The line that is over names the view.
2. `pnpm exec next analyze` opens the Turbopack bundle analyzer on the production build. Pick the route, then the chunk the table named, and read the modules inside it by size. A package that should be in the alerts chunk (zod, react-hook-form, TanStack Query) showing up in a shared chunk is the usual cause.
3. The usual causes: a client component importing a value from `@/domain` instead of `@/domain/<module>` (the barrel is types and pure logic only; schemas come from their module), a new static import of a widget that belongs behind `next/dynamic`, or a new dependency in a first-load component.
4. `next analyze` reports every client component of the route as first load, including Analyst ones Overview never renders, so trust the table for sizes and the analyzer for composition.

## Errors

`reportError` in `src/lib/events.ts` is the one place a failure is reported. Each report is one JSON line:

```json
{"level":"error","source":"boundary","name":"TypeError","message":"…","stack":"…","widget":"heat-map","path":"/","at":"2026-11-03T06:00:00.000Z"}
```

It goes to the console, and in production in the browser it is also beaconed to `/api/errors`, which writes the same line (with `"origin":"client"`) to the server log, where Vercel log search and drains can index it. Sources are `boundary` (a widget's error boundary), `window` (an uncaught error) and `promise` (an unhandled rejection). The same error is sent once per ten seconds and a page sends at most twenty.

## Caching

- `/geo/markets.<hash>.json`: `public, max-age=31536000, immutable`. The name carries a hash of the content, written by `pnpm build:geo`.
- `/`: `public, max-age=0, must-revalidate`. The page is dynamic because the URL is the state.
- `/api/*`: `no-store`.
- `/_next/static/*`: immutable, by Next's default.
