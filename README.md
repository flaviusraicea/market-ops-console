# Market Ops

A market operations console: portfolio performance, forecast attainment and an assistant.

**Live deployment:** https://market-ops-console-bay.vercel.app/

## Quick setup

- Node 22 (`engines` in `package.json`) and pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Script                               | What it does                                                          |
| ------------------------------------ | --------------------------------------------------------------------- |
| `pnpm dev` / `build` / `start`       | Next.js development server, production build, production server       |
| `pnpm lint` / `typecheck`            | ESLint (including layer boundaries) and `tsc --noEmit`                |
| `pnpm test`                          | All Vitest projects: `unit`, `stories`, `stories:dark`                |
| `pnpm test:unit` / `test:stories`    | Unit tests (jsdom) and Storybook stories in headless Chromium         |
| `pnpm test:e2e`                      | Playwright journeys with axe, against the production build            |
| `pnpm storybook` / `build-storybook` | Component workbench on port 6006, static build to `storybook-static/` |
| `pnpm check:contrast`                | Asserts every design-token contrast pair in both themes               |
| `pnpm run ci`                        | Lint, typecheck, contrast, tests, build and Storybook build           |

Component tests are Storybook stories with play functions; `pnpm test:stories` runs them headless in Chromium. Run `pnpm exec playwright install chromium` once before the browser tests.

Design and architecture documents live in `/docs` (copied from the design folder).

## Try it

- `Which markets are at risk?` shows the "Differs from source" note: the assistant says 3 markets are at risk, data.json says 4 at risk and 2 off track.
- `Why did Germany dip?` shows a sourced answer with a High confidence meter and clickable citations.
- `Compare APAC and Europe` streams a comparison answer.
- `Which markets are at risk?` asked at `/?region=eu` answers about Europe's five markets only; open Germany in Analyst mode and ask `Why did revenue dip?` to get that month's numbers.
- `What will sales be next year?` is the abstain demo: the assistant declines, says what the data covers and offers a question it can answer.

## Assistant notes

- Answers stream from `POST /api/chat` (Server-Sent Events) and can be stopped; a stopped answer keeps its text, is marked partial and carries no citations or confidence.
- Every question carries the view it was asked from (entity and month, shown in the question echo), and the mock backend answers about that view: the same question gives a different, cited answer in Europe than in the portfolio. The backend is still a fake: no model and no retrieval. It matches keywords, prefers the canned answer written for the current view, and for one template answer fills in numbers read from `data.json`.
- The conversation is kept in memory for the session only. A reload starts with an empty panel.

## Alert notes

- Analyst mode has an `Alert thresholds` card. Saving writes a growth rule and an attainment rule for the chosen scope through `POST /api/alerts`; saving the same metric and scope again updates the rule.
- The alerts backend is a mock: `POST`/`DELETE /api/alerts` validate, wait 600 ms and can fail, but store nothing. Rules are saved in your browser (`localStorage`, key `market-ops:alerts:v1`), so they survive a reload, stay in this browser only, and stay in step across tabs. If storage is disabled or full they last for the session.
- The `Simulate failure` checkbox sends `?fail=1`, so the route answers 500 after its 600 ms delay and the UI shows the rollback.

## Live mode notes

- The `Live` toggle in the header (in the Analyst toolbar below 768 px) starts a 5 second tick. Each tick moves the latest month's revenue and units for every market by up to ±2 %, never more than ±8 % from `data.json`. The numbers are simulated: nothing is fetched, nothing is saved, and a reload returns to the real data.
- Live mode is a client-side overlay. `applyLiveOverlay(dataset, tick)` in `src/lib/live.ts` is pure and seeded by the tick, so tests and stories replay the same sequence. The server still renders from `data.json`; when Live is first turned on the browser loads the full dataset in a lazy chunk and recomputes each widget's view model with the same functions the server uses.
- While live, a market's status is recomputed from its moved figures with the published rule (off track when growth is negative or attainment is below about 92.5 %; at risk below 100 %). This is the only place the app derives a market's status; captions read `Derived · live`.
- The URL, drill path, selection, open rail, palette and conversation are untouched. The assistant does not see the overlay and keeps answering from the saved data; the composer says so.
- Pausing freezes the figures. A hidden tab skips ticks. Under reduced motion values swap instantly and the pulsing dot is static.
