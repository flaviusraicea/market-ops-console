# Architecture

How the console is put together: the layers and the rule between them, where each kind of state lives, the contracts at every boundary, and how it is tested. The technology choices, with the reason for each and what it costs, are in section 10; the decision records in `decisions/` hold the options that were weighed.

## 1. Principles

| Principle | How it shows in the code |
|---|---|
| A pure domain layer at the core | `src/domain/` has no React, no Next and no fetch. It depends only on zod. Everything else imports from it; it imports nothing from the app. |
| Feature folders over a shared design system | Three layers, not two: `src/domain/`, `src/components/` (design system, no data knowledge) and `src/features/` (data-aware composites). A feature may import `domain` and `components`; `components` may import neither `domain` nor `features`. |
| Server loading and validation, with client islands | `data.json` is static. It is loaded and validated once on the server in a cached loader, and client islands receive typed, already-shaped props. Charts, the assistant and the alert form are client components; the page, the view models and the dashboard shells are computed on the server. `data.json` is never fetched on the client. |
| The URL is the single navigation state | One hook, `useConsoleContext()` over nuqs, is the only writer. Widgets never hold a copy. |
| zod contracts at every boundary | `data.json`; the SSE events and the chat request; the alert rule, shared by the form, the route handler and the browser store; the error report. |
| Explicit state machines for the answer and the alert save | Typed discriminated unions in reducers. No state-machine library: the two machines are small enough that a library would add more than it saves. |
| Failures stay local and are reported | Each widget sits in its own error boundary, so a chart that throws never takes the page down, and one function reports every failure (section 11). |

## 2. Layering and dependency rule

```
src/app/           Next.js routes, layouts, route handlers         (may import anything below)
src/features/      data-aware screens per user flow                (may import components, domain, lib)
src/components/    design system: primitives, charts, components   (may import lib)
src/lib/           framework glue: context hook, stream client, format, telemetry  (may import domain, data)
src/domain/        types, schemas, selectors, resolvers, rules     (may import nothing but zod)
```

Enforced by an ESLint `no-restricted-imports` allow-list per folder (`eslint.config.mjs`), with a package list per layer: `domain` may use zod only, `components` may not use nuqs, TanStack Query or zod, and relative imports may not climb into another layer. `tests/unit/boundaries.test.ts` lints sample code against the rules, so the boundary is tested, not promised. Two more lint rules keep concerns in one place: numbers, money, percentages and dates are formatted only in `src/lib/format.ts`, and `dangerouslySetInnerHTML` appears only in `src/app/layout.tsx` (the pre-paint script).

## 3. Folder tree

Everything lives under `src/`, one file per concept inside `domain/` and `lib/`, with the shadcn primitives at their default `components/ui/`.

```
src/
  proxy.ts                   runs before each page request: mode=overview → mode=executive (308); / without mode →
                             the signed-in role's view; a first visit is signed in as the default persona
  app/
    layout.tsx               fonts, providers; pre-paint script for data-theme, data-reduced-motion and
                             data-density; preloads the map geometry
    page.tsx                 server: loads the dataset, parses searchParams into a Context, renders the shell
    providers.tsx            NuqsAdapter, RoleProvider
    sign-in/page.tsx         the mock sign-in: pick a persona
    api/chat/route.ts        the mock SSE assistant; picks the fixture for the question and view (lib/stream/pickFixture.ts)
    api/alerts/route.ts      POST and DELETE: validate, wait 600 ms, refuse an Executive (403), ?fail=1 fails on request
    api/session/route.ts     POST sets the role cookie, DELETE signs out
    api/errors/route.ts      receives browser error reports and writes each as one JSON line to the server log
    api/vitals/route.ts      204 sink for web vitals
    tokens.css               every CSS variable, light and dark (from design-system.md)
    globals.css              Tailwind v4 @theme mapping tokens to utilities; the reduced-motion rule
  domain/                    pure, zod only, one file per concept
    dataset.ts               zod schema for data.json, parseDataset; Dataset, Market, Fact, Entity, Scope,
                             Context, Provenance, Status, Basis
    periods.ts               periodsForBasis (month, YTD, MAT), effectiveBasis, latestPeriod, previousPeriod
    scope.ts                 marketsIn, factsFor(scope), entityOf, entityName, breadcrumbTrail
    metrics.ts               totals, attainmentPct, growthPct, variance, momChangePct, unitsYoyPct, kpiFor,
                             statusCounts, attentionCount
    status.ts                the inferred status rule as text; statusForDerived for a region or the portfolio,
                             which data.json does not give; the Ask why questions
    provenance.ts            the Source and Derived labels
    citations.ts             Citation → resolved target or unresolved; disagreement detection
    alerts.ts                AlertRule schema, evaluateRule → breaching markets
    stream.ts                zod schemas for the SSE events, the chat request and fixtures.json
    sseGuard.ts              the zod-free stream guard the browser uses
    errors.ts                ErrorReport schema
    regions.ts, assistantPrefs.ts, index.ts   region ids; assistant open per mode; the barrel (types and pure logic)
  lib/                       app plumbing
    context/                 useConsoleContext, parsers, invariants (market ⇒ region), hrefFor, console meta,
                             dataset and navigation-transition providers
    dataset.ts               cached server loader around parseDataset
    fullDataset.ts           the whole dataset for the browser, imported only by the live-mode chunk
    format.ts                $22.85M, +7.3%, −9.7%, 1,676,586, May 2026, 2026-05
    theme.ts, themeKey.ts    data-theme, localStorage with try/catch, OS fallback
    motion.ts                the console's reduced-motion override, scroll intent, page-heading focus
    density.ts               derived from Context.mode
    live.ts                  the live-mode drift: bounded, deterministic per market and tick
    roles.ts, roles.server.ts, role.tsx   personas, role cookie, RoleProvider
    events.ts                typed event log and reportError
    vitals.tsx               web vitals to console.table in dev, sendBeacon /api/vitals in production; window errors
    stream/                  chatClient (fetch, AbortController, SSE parser), pickFixture, horizon
    storedState.ts, useHydrated.ts, useMediaQuery.ts, oneOf.ts, geoAsset.ts
  components/                presentational; may not import domain or features
    ui/                      shadcn primitives restyled with tokens (badge, bottom-sheet, button, card, collapsible,
                             command, dialog, dropdown-menu, form, input, label, select, skeleton, table,
                             textarea, tooltip)
    charts/                  visx chart kit: Frame, ChartTooltip, Legend, ViewAsTable, useChartKeyboard, scales,
                             svgPath; LineChart, RadarChart, HeatMap, Choropleth (and LazyChoropleth), Sparkline
    KpiTile, Notice, StatusBadge, StatusGlyph, ConfidenceMeter, CitationChip, CardHeader, Eyebrow, InfoTip,
    SegmentedControl
    icons.ts                 lucide re-exports with fixed sizes
    cn.ts                    class-name helper
  features/                  screens, one folder per user flow
    shell/                   Header (Breadcrumbs, PeriodSelect, ProductSelect, DataStamp, ModeSwitch, ThemeToggle,
                             AvatarMenu), PageToolbar, Layout, ShellGrid, DashboardColumn, AssistantRail and its
                             state, ErrorBoundary
    overview/                Verdict, StatusStrip, KpiRow, AttentionList (with top movers), MapCard, RegionBars,
                             view models, skeleton
    analyst/                 AnalystToolbar (period, product, BasisSelector, All facts), KpiStrip, MarketGrid,
                             MapSection, TimeSeriesCard, RadarCard, HeatMapCard, AlertsSection, FactsTable (lazy),
                             view models, skeletons, landing on a followed citation
    assistant/               Panel, MobileAssistant, EmptyState, Suggestions, Composer, AnswerList, AnswerCard (lazy),
                             CitationRow, SourcesTable, useAnswerMachine, AnswerMachine and AnswerStore providers,
                             askWhy, cross-checks against data.json
    alerts/                  AlertForm, RuleList, DeleteAlertDialog, useAlertSave (TanStack Query), api, storage
    palette/                 CommandPalette (lazy), PaletteButton, PaletteProvider, items
    live/                    LiveToggle, LiveProvider, LiveIslands, engine (lazy), selectors
    auth/                    SignIn
  data/
    data.json fixtures.json  verbatim from the starter pack
public/geo/markets.<hash>.json   generated by scripts/build-geo.ts and committed; src/lib/geoAsset.ts holds its URL
scripts/
  build-geo.ts               world-atlas 110m → public/geo/markets.<hash>.json (13 markets plus land)
  check-budget.ts, budget.ts loads Overview and Analyst in Chromium, fails over the budgets in package.json
  check-contrast.ts, contrast.ts   reads tokens.css, asserts every pair in design-system.md section 3
  gen-a11y-docs.ts           regenerates the Tab order and contrast tables in accessibility.md; --check in CI
tests/
  unit/                      domain, lib, hooks, route handlers, lint rules (Vitest, jsdom)
  e2e/                       Playwright: one spec per feature; frame-budget specs in tests/e2e/perf/
  fixtures/                  the starter pack's fixtures, to check the answers against
.storybook/                  Storybook 10 harness; stories (*.stories.tsx) sit next to their components
docs/                        design documents and decision records
```

## 4. Data flow

```
src/data/data.json ──(server, once, cached)──▶ parseDataset ──▶ Dataset (typed)
                                                     │
   URL searchParams ──▶ parseContext ──▶ Context ─────┤
                                                     ▼
                                   view models (Dataset, Context): typed, serialisable
                                                     │
                       server components render shells and pass view models as props
                                                     ▼
                       client islands: charts, assistant, form (read Context via hook, write via hook)
                                                     │
                            writes go to the URL (nuqs) → Next re-renders the server page
                            with new searchParams → new view models → islands update
```

- The page is a server component that reads `searchParams`, so a shared link renders correctly on first paint and Back and Forward are navigations, not state patches. The dashboard streams in behind a skeleton of the same shape, so the swap does not shift the page.
- View models are computed on the server. Interactions that do not change the URL (hover, tooltip, table toggle) stay inside the client component.
- The client gets the dataset without its fact series (`lightDataset`), enough to resolve citations and build the palette. The full series reaches the browser only in the live-mode chunk, loaded when Live is first turned on.
- The assistant, the alert save and delete, and the session switch are the only things that call route handlers.

## 5. URL schema (the only navigation state)

| Param | Type | Default | Invariant |
|---|---|---|---|
| `region` | `na \| eu \| apac \| latam` | absent (portfolio) | none |
| `market` | market id | absent | implies `region`; written together |
| `product` | product id | absent | requires `market` |
| `period` | `YYYY-MM` within `meta.periods` | `2026-05` (latest) | out-of-range values clamp to latest |
| `mode` | `executive \| analyst` | the signed-in role's view | drives density; always written, so a copied link names its view; `overview` is redirected (308) to `executive` |
| `metric` | `attainment \| revenue \| growth` | `attainment` | map colouring |
| `basis` | `month \| ytd \| mat` | `month` | Analyst only; MAT falls back to Month before twelve months of data |
| `cite` | integer index into the open answer's citations | absent | cleared when any other part of the Context changes |
| `facts` | `1` | absent | opens the facts table |

Written by one function, `setContext(partial)`, which applies the invariants and uses `history.push` when the drill, period or mode changes and `history.replace` for `metric`, `basis`, `cite` and `facts`. A write that breaks an invariant throws in development and is logged in production. `hrefFor` serialises a Context with the same parsers, so a breadcrumb link and a client-side write produce the same address. Example: `/?region=eu&market=de&product=veltrix&period=2026-03&mode=analyst&cite=1`.

## 6. State split

| Kind | Lives in | Examples | Library |
|---|---|---|---|
| Server state (facts) | server loader and view models | Dataset, view models | none; server components and zod |
| Navigation state | URL | Context (section 5) | nuqs |
| Identity | `market-ops-role` cookie | Executive or Analyst persona | none; set by `src/proxy.ts` and `/api/session` |
| Session state | providers and reducers | answer history, streaming buffer, followed citation, live tick | React `useReducer` and context |
| Remote mutable state | TanStack Query over browser storage | alert rules list, save and delete with optimistic update and rollback | @tanstack/react-query |
| Preferences | localStorage, with the OS setting as fallback | theme, reduced-motion override, assistant open per mode; the alerts section's open state in sessionStorage | `createStoredState` and small hooks |
| Ephemeral UI | local `useState` | hover, tooltip, open disclosure, dialog | React |

Rule: no global store. If a value is needed by two features, it is in the URL, derived from the Dataset, or held by a provider mounted once in `Layout`.

The role changes the view a URL without `mode` opens on and whether alert rules can be edited. It is a mock: there is no password, token or server session. The alerts route reads the cookie and answers `403 read_only_role` to an Executive, so the rule holds where the data is written, not only in the UI.

## 7. Contracts and state machines

**Contracts (zod, in `src/domain/dataset.ts`, `src/domain/stream.ts`, `src/domain/alerts.ts` and `src/domain/errors.ts`)**
- `DatasetSchema`: mirrors the starter pack's contract and refines it: every market's region and every fact's market and product exist; periods are consecutive months ending at `latestPeriod`; there is one fact per market, product and period; `priorYear` equals the actual twelve months earlier where that month is in the data. Parsed once per server process; the contract test parses the real file, so a malformed file fails CI.
- `SseEventSchema`: `{type:"token", value}` | `{type:"done", kind, citations, confidence}` | `{type:"error", message}`. The route asserts every outgoing event against it in development. The browser reads the stream with `sseGuard.ts`, a zod-free guard kept in step with the schema by tests, so zod stays out of the first bundle; unknown event types are ignored and logged, anything else unreadable is a protocol error.
- `ChatRequestSchema`: `{question, context?}`, where `context` is the entity and period the question was asked from. The route also checks that the entity and period exist in the dataset.
- `AlertRuleSchema`: `{id?, metric: "growth" | "attainment", comparator: "below", threshold, scope, createdAt?}` with the ranges from domain-model.md section 8 (growth −100 to 100, attainment 0 to 100). The inferred TypeScript type is shared by the form, the route handler, the browser store and the query cache.
- `ErrorReportSchema`: the shape `/api/errors` accepts.

**Answer machine (`src/features/assistant/useAnswerMachine.ts`)**

```
type AnswerState =
  | { status: "idle" }
  | { status: "streaming"; text: string; controller: AbortController }
  | { status: "done"; text: string; kind; confidence; citations: Resolved[] }
  | { status: "stopped"; text: string }                  // partial: no citations, no confidence
  | { status: "failed"; text: string; message: string }  // text may be "" or partial
events: ASK, TOKEN_FLUSH, DONE, STOP, ERROR, RETRY
```
Transitions follow domain-model.md section 7. `DONE` runs the citation resolver before entering `done`, so the UI never renders an unresolved chip without its flag. `RETRY` appends a new answer for the same question and leaves the old one as it was. The answer history lives in `AnswerMachineProvider`, in memory, so it survives navigation but not a reload.

**Alert save machine (`src/features/alerts/useAlertSave.ts`)**

```
idle → saving (optimistic row shown) → saved (inline "Saved · just now")
                                     → failed (rollback to previous snapshot, Notice shown) → saving (Try again)
```
Implemented with TanStack `useMutation` (`onMutate` snapshot and optimistic write, `onError` restore, `onSettled` invalidate once the last mutation in flight finishes). The `?fail=1` switch is set by the "Simulate failure" checkbox. The route validates, waits and can fail, but stores nothing: the browser keeps the rules in `localStorage` (`src/features/alerts/storage.ts`, with an in-memory fallback when storage is unavailable), so every serverless instance gives the same answer, and other tabs follow through the `storage` event.

## 8. Component tree (runtime)

```
RootLayout (server)                        fonts, pre-paint script, Providers (nuqs adapter, RoleProvider), WebVitals
└─ Page (server)                           loads Dataset, parses Context, computes view models
   └─ Layout                               rail, Ask why, answer store, landing, live, answer machine, palette providers
      ├─ Header (client)                   Breadcrumbs · LiveToggle · DataStamp · ModeSwitch · ThemeToggle · AvatarMenu
      ├─ ShellGrid
      │  ├─ DashboardColumn                Suspense; fallback: the skeleton of the current mode
      │  │  ├─ mode=executive: Overview (server)
      │  │  │  ├─ PageToolbar              period, product
      │  │  │  ├─ Verdict
      │  │  │  ├─ ErrorBoundary › StatusStrip
      │  │  │  ├─ ErrorBoundary › KpiRow         4 × KpiTile
      │  │  │  ├─ ErrorBoundary › AttentionList  flagged markets, top movers, Ask why
      │  │  │  ├─ ErrorBoundary › MapCard        Choropleth (lazy) + ViewAsTable + legend
      │  │  │  └─ ErrorBoundary › RegionBars
      │  │  └─ mode=analyst: Analyst (server)
      │  │     ├─ AnalystToolbar           period, product, basis, status rule, All facts toggle
      │  │     └─ Sheet
      │  │        ├─ ErrorBoundary › KpiStrip
      │  │        ├─ ErrorBoundary › MarketGrid      rows, sparklines, status tooltip, Ask why
      │  │        ├─ facts=1: ErrorBoundary › FactsTable (lazy, virtualised)
      │  │        ├─ ErrorBoundary › MapSection
      │  │        ├─ ErrorBoundary › TimeSeriesCard  LineChart + anomaly layer + ViewAsTable
      │  │        ├─ ErrorBoundary › RadarCard
      │  │        ├─ ErrorBoundary › HeatMapCard     grid keyboard model
      │  │        └─ ErrorBoundary › AlertsSection   folded; AlertForm + RuleList + DeleteAlertDialog
      │  └─ Panel (client): a column or rail from 1024 px; MobileAssistant, a bottom sheet, below
      │       EmptyState · Suggestions · AnswerList › AnswerCard › CitationRow · ConfidenceMeter · SourcesTable · Composer
      └─ CommandPalette (client, lazy)
```

The Analyst widgets, the alerts section, the facts table, the map, the answer card, the palette, the account menu and the live engine are separate chunks, loaded when first rendered or first asked for. Islands receive serialisable view models only.

## 9. Testing

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest (jsdom) | domain selectors with real numbers, citation resolver, alert evaluator, parsers and URL invariants, formatters, SSE parsing and token batching, the answer and alert-save machines, route handlers, safe rendering of model output, the no-LLM dependency check, the layer rules |
| Contracts | Vitest | `DatasetSchema` against the real file; the stream guard against the zod schema; `fixtures.json` against its schema; the chat request with and without a view |
| Component | Storybook stories with play functions, run by the Storybook Vitest addon in Chromium, once in light and once in dark; the a11y addon fails on violations | the `src/components/` components and the client `src/features/` components, per state, with mocked streams and mutations |
| E2E | Playwright (with `@axe-core/playwright`) against the production build | one spec per feature; axe in light and dark on the main screens; frame-budget specs in `tests/e2e/perf/`, run alone after the rest of the suite and never retried |
| Tokens | `scripts/check-contrast.ts` | every text pair at 4.5:1 and every graphic pair at 3:1, in both themes; CI gate |
| Docs | `scripts/gen-a11y-docs.ts --check` | the Tab order and contrast tables in accessibility.md match the tests and the tokens |
| Budgets | `scripts/check-budget.ts`, Lighthouse CI | bytes received per view; see performance-monitoring.md |

`pnpm ci` runs lint, the format check, typecheck, contrast, the accessibility-docs check, the unit and story tests, the build, the budget check and the Storybook build.

## 10. Technology choices

| Decision | Choice | Why | Trade-off |
|---|---|---|---|
| Framework | Next.js App Router | first paint already reflects the URL; route handlers host the mock stream and the alerts endpoint | the server and client split has to be kept explicit in the folders |
| Styling | Tailwind v4, shadcn/ui restyled onto `tokens.css` | accessible Radix primitives in our own visual language, for every component including the chart surroundings (cards, toolbars, tooltips, tables, View as table); no raw hex outside `tokens.css` | every primitive is copied in and owned |
| Charts | visx with d3-geo and topojson-client | one accessible SVG model for all four forms; tokens through CSS variables; one tooltip, one keyboard pattern, one View as table | more code per chart than a charting library; Recharts would cover line and radar, but not the map or heat map, and would mean two systems |
| Map data | world-atlas 110m, filtered at build time | offline, public domain, one small content-hashed file | coarse coastlines; Natural Earth 50m would be finer and larger |
| Fourth visualisation | heat map | Germany's March dip reads at a glance; a cell click drives the other views | no scatter of growth against share |
| URL state | nuqs | typed parsers shared by server and client, history for free | one more dependency than a hand-rolled `useSearchParams` wrapper |
| Server state | server components, zod, view models | the data contract is the semantic layer; no client fetch of a static file | view models must be serialisable |
| Mutations | TanStack Query for alerts only | optimistic update and rollback in a few lines, and the server and client split reads plainly | a dependency used by one feature; `useOptimistic` and a reducer would have been lighter |
| Forms | react-hook-form, zod, shadcn Form | one schema from the form to the route | a library for one form |
| Virtualisation | @tanstack/react-virtual | small, headless, works with a semantic `<table>` | rows outside the viewport are not in the DOM |
| Command palette | cmdk via shadcn Command | keyboard-first, accessible | loaded lazily to stay out of the first bundle |
| Tests | Vitest, Storybook, Playwright, axe | standard, fast, one tool per layer | the story tests need a browser in CI |
| Observability | web vitals, typed event log, error boundaries, `reportError` | the brief scores it; cheap | no hosted error tracker |
| Deploy | Vercel | zero configuration for the App Router and the SSE route (`runtime = "nodejs"`); Speed Insights for real-user data | tied to one host's preview and log tooling |

## 11. Performance and observability

- Core Web Vitals: server-rendered first paint with no client fetch of data; fonts with `display: swap` and fallbacks; charts hydrate as islands; the map geometry is a static file of about 70 KB, preloaded with the HTML and fetched once; the facts table is virtualised; skeletons reserve the dashboard's heights and density is set before first paint, so nothing shifts.
- Bundle: visx is imported per package (`@visx/scale`, `@visx/shape` and so on), so only the primitives in use ship. Overview ships the shell and its own islands; every Analyst widget, the alerts section (with TanStack Query, react-hook-form and zod), the map code (d3-geo, visx geo), the answer card, the live engine and cmdk are separate chunks loaded when first rendered. The domain barrel (`@/domain`) carries types and pure logic only; the zod schemas are imported from their modules by the server routes, the dataset loader, the alert form and the tests, so the schema library never reaches the first load. Budgets are in `package.json` and enforced by `pnpm check:budget` (see `performance-monitoring.md`).
- Caching: `/geo/*` is content-hashed and served immutable; the page is `private, no-cache`, because the URL is the state and the role cookie picks the view; `/api/*` is `no-store`; `/_next/static` is immutable by default.
- No jank while streaming: tokens collect in a buffer and are flushed with `requestAnimationFrame`, one render per frame at most; chart transitions are CSS tweens on SVG attributes (`--dur-chart`, 240 ms), zeroed under reduced motion.
- Observability: `src/lib/vitals.tsx` reports LCP, CLS and INP to `console.table` in development and beacons them to `/api/vitals` (a no-op route) in production. `src/lib/events.ts` keeps a typed event log of the last 200 events (navigate, ask, widget error, invalid context, alert save failure, error) with timestamps. Each widget sits in an error boundary that renders the inline Notice and reports the error with its widget name. `reportError` is the one place a failure is reported: it writes a single JSON line (level, source, name, message, short stack, widget or route, path, time) to the console and, in the browser in production, beacons it to `/api/errors`, which writes the same line to the server log. Boundaries, `window.onerror`, unhandled rejections, stream failures and failed fetches all go through it; the same error is sent once per ten seconds and a page sends at most twenty.
