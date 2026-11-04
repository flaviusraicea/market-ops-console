# Market Ops

A market operations console: portfolio performance, forecast attainment and an assistant.

**Live deployment:** https://market-ops-console-bay.vercel.app/

**Scope:** designed for desktop (1024 px and up), usable on tablet and phone. On a phone the Overview works fully and Analyst is readable (wide tables scroll inside their own region; the assistant is a bottom sheet), not built for operating.

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

## Tool choices

Each row gives the problem, the choice, and the alternative turned down with the reason. The full records are in [`docs/decisions/`](docs/decisions/).

| Problem                                                                                                                                                          | Choice                                                                                                                                                                                                                                                      | Turned down                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A shared link must open on the right view at first paint, and the mock assistant and alerts need a server ([0001](docs/decisions/0001-nextjs-app-router.md))     | Next.js App Router: server components read the URL and the data, route handlers host `/api/chat` and `/api/alerts`                                                                                                                                          | A Vite SPA with a separate API: the first paint is blank until the client reads the URL, and there are two things to deploy                                                   |
| A distinctive look with accessible primitives and no ad-hoc CSS ([0005](docs/decisions/0005-shadcn-restyled-tokens.md))                                          | Design tokens as CSS variables in `tokens.css`, Tailwind v4 utilities over them, shadcn/Radix primitives restyled onto them, one shared component per concept; `pnpm check:contrast` checks every token pair in both themes                                 | shadcn defaults, which look generic; primitives built from scratch, which means redoing Radix's focus and ARIA handling                                                       |
| Four chart forms, all themed by tokens and all reachable by keyboard and screen reader ([0002](docs/decisions/0002-visx-charts.md))                              | visx (d3 primitives rendered by React), with d3-geo for the map; one tooltip, one keyboard pattern and one View as table for every chart                                                                                                                    | Recharts, which has no map or heat map and would mean two systems; ECharts, which draws to canvas and leaves no DOM to label; Nivo, which is heavy and brings its own theming |
| Actual against forecast and prior year over 24 months                                                                                                            | Time series: three lines, forecast dashed, the anomaly labelled; View as table lists the months                                                                                                                                                             | Bars, which make a trend over 24 periods harder to follow                                                                                                                     |
| A market's profile across five measures at once                                                                                                                  | Radar: attainment, growth, share, month on month and units YoY, each axis scaled from the lowest to the highest value shown; View as table lists the values                                                                                                 | Grouped bars, which make a profile shape harder to compare across markets                                                                                                     |
| Where attainment sits geographically, and drilling into a region                                                                                                 | Choropleth from world-atlas 110m, filtered at build time to the 13 markets ([0007](docs/decisions/0007-map-data-world-atlas.md)); status carries a glyph and text as well as colour, and markets are reachable by keyboard; View as table lists the markets | A hosted map or tile service, which needs a key and the network                                                                                                               |
| Spotting a pattern across markets and months ([0008](docs/decisions/0008-heat-map-over-scatter.md))                                                              | Heat map of markets by month, coloured by diverging attainment, which reads at a glance; a keyboard grid, and a cell click sets market and month in the URL; View as table lists the cells. Coordinated views come from click-to-drill in every view        | A scatter with a brush: over 13 markets a brush adds an interaction mode for little gain                                                                                      |
| Drill, period, mode and the open citation must survive a reload, a shared link and back/forward ([0003](docs/decisions/0003-url-state-nuqs.md))                  | The URL is the only navigation state, through nuqs typed parsers behind one hook that applies the invariants                                                                                                                                                | A client store synced to the URL, which gives two sources of truth; a hand-rolled `useSearchParams` wrapper, which is untyped and not readable on the server                  |
| Server state against client state ([0009](docs/decisions/0009-server-state-rsc-zod.md), [0004](docs/decisions/0004-tanstack-query-alerts-only.md))               | `data.json` is parsed once on the server with zod and reaches client islands as view models; TanStack Query holds only the alert rules and their optimistic save with rollback; UI state stays local to its component; no global store                      | TanStack Query for all data, which fetches a static file on the client; a global store, which nothing needs beyond the URL                                                    |
| A non-trivial form whose rules hold on the server too ([0010](docs/decisions/0010-forms-react-hook-form-zod.md))                                                 | react-hook-form with one zod schema shared by the form, the route handler and the mutation                                                                                                                                                                  | A native form with zod on submit, which needs hand wiring for inline errors per field                                                                                         |
| A non-trivial assistant surface without a model                                                                                                                  | `/api/chat` streams scripted fixtures as Server-Sent Events: deterministic, offline and testable. A real LLM would plug in behind the same event contract                                                                                                   | Calling a hosted model, which needs a key, costs per request and makes tests and demos non-deterministic                                                                      |
| Tests for logic, components, journeys and accessibility ([0006](docs/decisions/0006-storybook-component-tests.md), [0011](docs/decisions/0011-testing-stack.md)) | Vitest for domain logic, Storybook stories with play functions and axe in real Chromium for components, Playwright with axe against the production build for journeys                                                                                       | Jest with Testing Library in jsdom, which has no real layout, focus or CSS to test against                                                                                    |

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

## Roles (mock)

- You are signed in automatically as **Executive** (Dana Whitfield). The avatar at the right of the header shows who you are and switches to **Analyst** (Sam Okafor) in one click; `Sign out` opens a mock SSO screen with the two personas. Both roles see every page and all of the data.
- The role changes three things: the view a URL without `mode` opens on (`/` is the Executive overview for an Executive and the Analyst deep-dive for an Analyst; a `mode` in a shared link always wins), whether alert rules can be edited, and the sign-in screen. Executives read the rules; the fields are disabled and `POST`/`DELETE /api/alerts` answer `403 read_only_role`, so the rule holds where the data is written, not only in the UI.
- Nothing about it is real: no password, token or server session. The role is one cookie (`market-ops-role`, set by `src/proxy.ts` on a first visit and changed by `POST /api/session`).
- Real SSO would add an OIDC provider, a server session and role claims in the token. Region scoping would come with it: a Regional lead would see only their region's markets, and the Context invariants already make that a one-line filter in `marketsIn`.
- Old links with `mode=overview` are redirected (308) to `mode=executive`.

## Alert notes

- Analyst mode has an `Alert thresholds` card (read-only when you are signed in as Executive; see Roles). Saving writes a growth rule and an attainment rule for the chosen scope through `POST /api/alerts`; saving the same metric and scope again updates the rule.
- The alerts backend is a mock: `POST`/`DELETE /api/alerts` validate, wait 600 ms and can fail, but store nothing. Rules are saved in your browser (`localStorage`, key `market-ops:alerts:v1`), so they survive a reload, stay in this browser only, and stay in step across tabs. If storage is disabled or full they last for the session.
- The `Simulate failure` checkbox sends `?fail=1`, so the route answers 500 after its 600 ms delay and the UI shows the rollback.

## Live mode notes

- The `Live` toggle in the header (in the Analyst toolbar below 768 px) starts a 5 second tick. Each tick moves the latest month's revenue and units for every market by up to ±2 %, never more than ±8 % from `data.json`. The numbers are simulated: nothing is fetched, nothing is saved, and a reload returns to the real data.
- Live mode is a client-side overlay. `applyLiveOverlay(dataset, tick)` in `src/lib/live.ts` is pure and seeded by the tick, so tests and stories replay the same sequence. The server still renders from `data.json`; when Live is first turned on the browser loads the full dataset in a lazy chunk and recomputes each widget's view model with the same functions the server uses.
- While live, a market's status is recomputed from its moved figures with the published rule (off track when growth is negative or attainment is below about 92.5 %; at risk below 100 %). This is the only place the app derives a market's status; captions read `Derived · live`.
- The URL, drill path, selection, open rail, palette and conversation are untouched. The assistant does not see the overlay and keeps answering from the saved data; the composer says so.
- Pausing freezes the figures. A hidden tab skips ticks. Under reduced motion values swap instantly and the pulsing dot is static.

## Limits and with more time

- JS budgets 250/300 KB gzip are enforced in CI; both pages sit within 2% of them, and the next headroom comes from server components for static card shells (with more time).
- The assistant is scripted on purpose: `/api/chat` streams fixture answers over Server-Sent Events, with no LLM behind it. A real model would plug in behind the same `/api/chat` event contract.
- Numbers, money and month names use one fixed locale, en-US, and USD, the data's currency, so output is the same in every test, screenshot and browser (`src/lib/format.ts`). A real product would take the locale from the user.
- Following a citation from Executive to Analyst mounts the Analyst view in one long task: about 170 to 210 ms at 4× CPU slowdown and about 50 ms at 1×. With more time: split the static card shells into server components so less of that mount runs on the client.
- Automated tests run in Chromium; VoiceOver and Safari are checked by hand on a Mac.<!-- TODO(Flavius): add the result of the Mac run. -->
- `reportError` writes one JSON line per failure and `/api/vitals` one per vital, both to the server log. With more time: feed `reportError` to Sentry, which is one init call plus the DSN.
- With more time: fold the Markets table's sparklines into the row at docked widths (assistant panel open), so the table keeps its trend column when it narrows.
- With more time: stack the Analyst rows at docked widths of 1152 px and below. There the radar now draws near its minimum size (a 36 px spoke at 1024 px).
