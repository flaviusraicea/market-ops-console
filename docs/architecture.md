# Architecture

**Status: approved by Flavius on 2026-11-02.** Decisions: visx for all four charts; shadcn/ui for every other component including chart surroundings (cards, toolbars, tooltips, tables, View as table); TanStack Query for the alert mutation; Vercel for deployment. Section 12's questions are answered accordingly.

Originally for approval. It folds in the parked tech recommendations (design/tech-decisions.md) as section 10, and pressure-tests the early read in section 1. Implementation specs for each slice follow directly from sections 3 to 9.

## 1. Pressure test of the early read

| Early read | Verdict | Nuance |
|---|---|---|
| Pure domain layer at the core | Agree | `domain/` has no React, no Next, no fetch. It depends only on zod. Everything else imports from it; it imports nothing from the app. |
| Feature-sliced folders over a shared design-system layer | Agree | Three layers, not two: `domain/`, `ui/` (design system, no data knowledge), `features/` (data-aware composites). A feature may import `domain` and `ui`; `ui` may import neither. |
| RSC server-loading and validation with client islands | Agree, with a simplification | `data.json` is static. Load and validate it once on the server in a cached loader, pass typed, already-shaped props to client islands. Charts, the assistant and the form are client components; tiles and the grid shell can be server-rendered. No client-side fetch of data.json, ever. |
| URL as the single navigation state | Agree | One hook, `useContext()` over nuqs, is the only writer. Widgets never hold a copy. |
| zod contracts for data.json and SSE | Agree | Plus a third contract: the alert rule, shared by form, route and store. |
| Explicit state machines for the answer and the alert save | Agree | Typed discriminated unions in reducers. No state-machine library; the two machines are small enough that a library would read as over-engineering. |

One thing the read does not name: an error boundary per widget, so a chart throwing never takes the page down, and a small observability layer (web vitals and a typed event log). The brief scores performance and observability, so they get a home (section 11).

## 2. Layering and dependency rule

```
app/            Next.js routes, layouts, route handlers      (may import features, ui, domain, lib)
features/       data-aware composites per capability          (may import ui, domain, lib)
ui/             design system: tokens, primitives, charts     (may import lib only)
domain/         types, schema, selectors, resolvers, rules    (may import nothing but zod)
lib/            framework glue: context hook, stream client, format, observability
```

Enforced by an ESLint `no-restricted-imports` rule per folder, so the boundary is tested, not promised.

## 3. Folder tree

```
app/
  layout.tsx                 html[data-theme], fonts, tokens.css, ThemeProvider, nuqs adapter
  page.tsx                   server: loads data, reads searchParams, renders <Console>
  api/chat/route.ts          the reference SSE handler, typed with domain/contracts/sse
  api/alerts/route.ts        GET list, POST upsert, DELETE; in-memory store; ?fail=1 switch
  tokens.css                 every CSS variable, light + dark (from design-system.md)
  globals.css                Tailwind v4 @theme mapping tokens to utilities
domain/
  contracts/data.ts          zod schema for data.json → Dataset, Market, Fact, Kpis, Anomaly
  contracts/sse.ts           zod schema for token | done | error events, Citation, Kind, Confidence
  contracts/alert.ts         zod schema for AlertRule
  model/types.ts             Entity, Scope, Period, Context, Provenance, Status, Basis
  selectors/totals.ts        total, attainment, growth, variance, momChange (5.1 to 5.5)
  selectors/periods.ts       ytd, mat, periodRange, latestPeriod, horizon
  selectors/rankings.ts      topMovers, attentionCount, statusCounts
  selectors/scope.ts         factsFor(scope), entityName, breadcrumbTrail
  citations/resolve.ts       Citation → ResolvedTarget | Unresolved; disagreement detection
  alerts/evaluate.ts         AlertRule → breaching markets
  status/rule.ts             the inferred rule as text only (tooltip + README); never computes status
  index.ts
lib/
  context/useConsoleContext.ts   nuqs parsers, invariants (market ⇒ region), single write API
  context/parsers.ts
  stream/chatClient.ts           fetch + AbortController + SSE line parser → typed events
  format/number.ts               $22.85M, +7.3%, −9.7%, 1,676,586, May 2026, 2026-05
  observability/vitals.ts        web-vitals → console/table in dev, POST /api/vitals no-op in prod
  observability/events.ts        typed event log (navigate, ask, stop, cite, save, rollback)
  theme/useTheme.ts              data-theme, localStorage try/catch, OS fallback
  density/useDensity.ts          derived from Context.mode
ui/
  primitives/                    Button, Badge, Card, Chip, Tooltip, Collapsible, Tabs, Segmented,
                                 Table, Input, Select, Textarea, Dialog, Skeleton, Notice, FocusRing
  components/                    KpiTile, StatusBadge, ConfidenceMeter, CitationChip, Breadcrumbs,
                                 ContextChips, DataStamp, ModeSwitch, ThemeToggle, ViewAsTable
  charts/                        chart kit on visx: Frame, Axes, Grid, Tooltip, Legend, Crosshair,
                                 useChartKeyboard; LineChart, RadarChart, HeatMap, Choropleth, Sparkline
  icons.ts                       lucide re-exports with fixed sizes
features/
  shell/                         Header (breadcrumbs, period, stamp, mode, theme), Layout, ErrorBoundary
  overview/                      KpiRow, TopMovers, MapCard (exec screen)
  analyst/                       MarketGrid, TimeSeriesCard, RadarCard, HeatMapCard, BasisSelector,
                                 FactsTable (virtualised, slice 12a)
  assistant/                     Panel, Composer, Suggestions, AnswerCard, AnswerList, SourcesTable,
                                 useAnswerMachine (reducer), useAskWhy
  alerts/                        AlertForm, RuleList, useAlertSave (TanStack mutation), DeleteDialog
  palette/                       CommandPalette (slice 12b)
scripts/
  build-geo.ts                   world-atlas 110m → public/geo/markets.json (13 markets + land)
  check-contrast.ts              reads tokens.css, asserts every pair in design-system.md §3
data/
  data.json, fixtures.json       verbatim from the starter pack
public/geo/markets.json          generated, committed
tests/
  unit/                          domain, lib (Vitest)
  component/                     ui, features (Vitest + Testing Library)
  e2e/                           Playwright, one spec per slice
.storybook/                      slice 12c
```

## 4. Data flow

```
data/data.json ──(server, once, cached)──▶ domain.parseDataset ──▶ Dataset (typed)
                                                     │
   URL searchParams ──▶ parseContext ──▶ Context ─────┤
                                                     ▼
                                   selectors(Dataset, Context) ──▶ view models (typed, serialisable)
                                                     │
                       server components render shells and pass view models as props
                                                     ▼
                       client islands: charts, assistant, form (read Context via hook, write via hook)
                                                     │
                            writes go to the URL (nuqs) → Next re-renders the server page
                            with new searchParams → new view models → islands update
```

- The page is a server component that reads `searchParams`, so a shared link renders correctly on first paint and back/forward is a navigation, not a state patch.
- Selectors run on the server for the initial render and on the client for interactions that do not change the URL (hover, tooltip, table toggle). They are pure, so both sides agree.
- The assistant and the alert store are the only things that talk to route handlers.

## 5. URL schema (the only navigation state)

| Param | Type | Default | Invariant |
|---|---|---|---|
| `region` | `na \| eu \| apac \| latam` | absent (portfolio) | — |
| `market` | market id | absent | implies `region`; written together |
| `product` | product id | absent | requires `market` |
| `period` | `YYYY-MM` within `meta.periods` | `2026-05` | out-of-range values clamp to latest |
| `mode` | `overview \| analyst` | `overview` | drives density |
| `metric` | `attainment \| revenue \| growth` | `attainment` | map colouring |
| `basis` | `month \| ytd \| mat` | `month` | analyst only; ignored in overview |
| `cite` | integer index into the open answer's citations | absent | cleared when the answer changes |
| `facts` | `1` | absent | opens the facts table (slice 12a) |

Written by one function, `setContext(partial)`, which applies the invariants and uses `history.push` for drill, period and mode changes and `history.replace` for `cite` and `facts`. Example: `/?region=eu&market=de&product=veltrix&period=2026-03&mode=analyst&cite=1`.

## 6. State split

| Kind | Lives in | Examples | Library |
|---|---|---|---|
| Server state (facts) | server loader + selectors | Dataset, view models | none; RSC + zod |
| Navigation state | URL | Context (section 5) | nuqs |
| Session state | component reducers | answer list, streaming buffer, stop flag | React `useReducer` |
| Remote mutable state | TanStack Query | alert rules list, save mutation with optimistic update and rollback | @tanstack/react-query |
| Preferences | localStorage with OS fallback | theme, reduced-motion override | tiny hook |
| Ephemeral UI | local `useState` | hover, tooltip, open disclosure, dialog | React |

Rule: no global store. If a value is needed by two features, it is either in the URL or derived from the Dataset.

## 7. Contracts and state machines

**Contracts (zod, in `domain/contracts`)**
- `DatasetSchema`: mirrors CONTRACT.md; refines that `priorYear` matches the earlier actual where present and that every market's region exists. Parsed once; a failure fails the build, not the page.
- `SseEventSchema`: `{type:"token", value}` | `{type:"done", kind, citations, confidence}` | `{type:"error", message}`. Unknown event types are ignored and logged.
- `AlertRuleSchema`: `{id?, metric, comparator:"below", threshold, scope}` with the ranges from domain-model.md section 8; inferred TypeScript types are shared by the form, the route handler and the query cache.

**Answer machine (`features/assistant/useAnswerMachine`)**

```
type AnswerState =
  | { status: "idle" }
  | { status: "streaming"; text: string; controller: AbortController }
  | { status: "done"; text: string; kind; confidence; citations: Resolved[] }
  | { status: "stopped"; text: string }            // partial: no citations, no confidence
  | { status: "failed"; text: string; message: string }  // text may be "" or partial
events: ASK, TOKEN, DONE, STOP, ERROR, RETRY
```
Transitions follow domain-model.md section 7. `DONE` runs the citation resolver before entering `done`, so the UI never renders an unresolved chip without its flag.

**Alert save machine (`features/alerts/useAlertSave`)**

```
idle → saving (optimistic row shown) → saved (toast-less inline "Saved · just now")
                                     → failed (rollback to previous snapshot, Notice shown) → saving (Try again)
```
Implemented with TanStack `useMutation` (`onMutate` snapshot + optimistic write, `onError` restore, `onSettled` invalidate). The `?fail=1` switch is set by the "Simulate failure" checkbox.

## 8. Component tree (runtime)

```
RootLayout (server)                       theme attr, fonts, providers (nuqs adapter, QueryClient)
└─ ConsolePage (server)                   loads Dataset, parses Context, computes view models
   ├─ Header (client island)              Breadcrumbs · ContextChips · PeriodSelect · DataStamp · ModeSwitch · ThemeToggle
   ├─ Dashboard (server shell)
   │  ├─ ErrorBoundary › KpiRow           4 × KpiTile (server-rendered, props)
   │  ├─ ErrorBoundary › MapCard (client) Choropleth + ViewAsTable + legend
   │  ├─ ErrorBoundary › TopMovers        rows + AskWhy buttons (client)
   │  └─ mode=analyst:
   │     ├─ BasisSelector (client)
   │     ├─ ErrorBoundary › MarketGrid    rows, sparklines, status tooltip, AskWhy
   │     ├─ ErrorBoundary › TimeSeriesCard LineChart + anomaly layer + ViewAsTable
   │     ├─ ErrorBoundary › RadarCard
   │     ├─ ErrorBoundary › HeatMapCard   grid keyboard model
   │     ├─ ErrorBoundary › AlertsCard    AlertForm + RuleList + DeleteDialog
   │     └─ facts=1: FactsTable (virtualised)
   └─ AssistantPanel (client island)      Suggestions · AnswerList › AnswerCard › CitationChips · ConfidenceMeter · SourcesTable · Composer
CommandPalette (client, lazy)             slice 12b
```

Islands receive serialisable view models only (no Dataset on the client except the facts needed by the open charts, which is the whole series for the selected scope, at most 120 rows, or 1,560 for the facts table).

## 9. Testing stack and slice mapping

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest | domain selectors with real numbers, resolver, evaluator, parsers, formatters, SSE line parser |
| Component | Vitest + Testing Library + jest-axe | every `ui/` component per state; features with mocked streams and mutations |
| E2E | Playwright (+ axe-core/playwright) | one spec per slice from user-flows.md, both themes for slices 1 and 11 |
| Contracts | Vitest | `DatasetSchema` against the real file; `SseEventSchema` against recorded fixture streams |
| Tokens | `scripts/check-contrast.ts` | CI gate |
| Visual | Storybook + a11y addon (slice 12c) | per component and state |

| Slice | Folders touched | Primary test |
|---|---|---|
| 0 | domain, lib/context, app/tokens.css, features/shell | unit + contrast |
| 1 | features/shell, features/assistant (empty state), ui/primitives | E2E cold open |
| 2 | features/overview, ui/charts/Choropleth, scripts/build-geo | E2E tiles and map |
| 3 | lib/context, features/shell | E2E drill, share, back |
| 4 | features/analyst, ui/charts (Line, Radar, HeatMap, Sparkline) | E2E coordinated views |
| 5 | lib/stream, features/assistant/useAnswerMachine, Composer | E2E stream and stop |
| 6 | domain/citations, CitationChip, context `cite` | E2E citation navigation |
| 7 | SourcesTable, disagreement path | E2E differs |
| 8 | AnswerCard states, Notice | E2E low, abstain, error |
| 9 | useAskWhy, TopMovers, MarketGrid | E2E ask why |
| 10 | features/alerts, app/api/alerts, domain/alerts | E2E save and rollback |
| 11 | lib/theme, lib/density, a11y sweep | E2E axe both themes |
| 12 | FactsTable, CommandPalette, .storybook | per item |

## 10. Technology recommendations (for approval)

| Decision | Recommendation | Reason in one line | Alternative if rejected |
|---|---|---|---|
| Framework | Next.js App Router (approved) | — | — |
| Styling | Tailwind v4 + shadcn/ui restyled + tokens.css (approved) | — | — |
| Charts | visx + d3-geo + topojson-client | one accessible SVG model for all four forms; tokens via CSS variables | Recharts for line/radar/scatter plus hand-written map and heat map (two systems) |
| Map data | world-atlas 110m pre-filtered at build time | offline, public domain, tens of KB | Natural Earth 50m if detail is wanted (larger) |
| Fourth viz | Heat map (approved) | — | — |
| URL state | nuqs | typed parsers, server-readable, back/forward for free | hand-rolled `useSearchParams` wrapper |
| Server state | RSC loader + zod + selectors | the data contract is the semantic layer | TanStack Query on the client (needless fetch of a static file) |
| Mutations | TanStack Query for alerts only | optimistic update and rollback in a dozen lines | `useOptimistic` + reducer |
| Forms | react-hook-form + zod + shadcn Form | one schema end to end | native form + zod on submit |
| Virtualisation | @tanstack/react-virtual | small, headless, works with a semantic `<table>` | react-window |
| Command palette | cmdk via shadcn Command | keyboard-first, accessible | none |
| Tests | Vitest, Testing Library, Playwright, axe | standard, fast, CI-friendly | Jest |
| Observability | web-vitals + typed event log + error boundaries | the brief scores it; cheap | none |
| Deploy | Vercel | zero-config for App Router and the SSE route (`runtime = "nodejs"`) | Netlify |

Known mock limitation to state in the README: the alert store is in-memory per server instance, so on serverless hosting saved rules can vanish between requests. The demo flow (save, see evaluation, simulate failure, rollback) works within a session, which is what the brief asks for.

## 11. Performance and observability

- Core Web Vitals: server-rendered first paint with no client fetch; fonts with `display=swap` and fallbacks; charts hydrate as islands; the map geometry is a 30 to 60 KB static file loaded only when the map is in view; the facts table is virtualised; no layout shift because skeletons reserve the exact heights from design-system.md.
- Bundle: visx is imported per package (`@visx/scale`, `@visx/shape`…) so only used primitives ship; d3-geo and topojson-client are loaded with the map island; cmdk is lazy.
- No jank while streaming: tokens are appended to a ref and flushed with `requestAnimationFrame`, one render per frame at most; chart transitions use CSS on SVG attributes, 240 ms, disabled under reduced motion.
- Observability: `lib/observability` reports LCP, CLS, INP via `web-vitals` to the console in dev and to a no-op route in prod; a typed event log records navigate, ask, token count, stop, cite, save and rollback with timestamps, viewable in a dev-only drawer; each widget sits in an error boundary that renders the inline Notice and logs the error with the Context at the time.

## 12. Questions for Flavius

1. Charts: approve visx (the one decision that shapes the most code), or prefer Recharts for the three it supports and accept two chart systems?
2. Mutations: approve TanStack Query for the alert save only, or keep dependencies lower with `useOptimistic` and a reducer? My advice: TanStack, because it shows the server-versus-client split the brief asks about in a way a reviewer recognises.
3. Deploy target: Vercel, assuming you have an account? The SSE route needs the Node runtime, which Vercel supports by default.
