# Architecture

**Status: approved by Flavius on 2026-11-02.** Decisions: visx for all four charts; shadcn/ui for every other component including chart surroundings (cards, toolbars, tooltips, tables, View as table); TanStack Query for the alert mutation; Vercel for deployment. Section 12's questions are answered accordingly.

Originally for approval. It folds in the parked tech recommendations (design/tech-decisions.md) as section 10, and pressure-tests the early read in section 1. Implementation specs for each slice follow directly from sections 3 to 9.

## 1. Pressure test of the early read

| Early read | Verdict | Nuance |
|---|---|---|
| Pure domain layer at the core | Agree | `src/domain/` has no React, no Next, no fetch. It depends only on zod. Everything else imports from it; it imports nothing from the app. |
| Feature-sliced folders over a shared design-system layer | Agree | Three layers, not two: `src/domain/`, `src/components/` (design system, no data knowledge), `src/features/` (data-aware composites). A feature may import `domain` and `ui`; `ui` may import neither. |
| RSC server-loading and validation with client islands | Agree, with a simplification | `data.json` is static. Load and validate it once on the server in a cached loader, pass typed, already-shaped props to client islands. Charts, the assistant and the form are client components; tiles and the grid shell can be server-rendered. No client-side fetch of data.json, ever. |
| URL as the single navigation state | Agree | One hook, `useContext()` over nuqs, is the only writer. Widgets never hold a copy. |
| zod contracts for data.json and SSE | Agree | Plus a third contract: the alert rule, shared by form, route and store. |
| Explicit state machines for the answer and the alert save | Agree | Typed discriminated unions in reducers. No state-machine library; the two machines are small enough that a library would read as over-engineering. |

One thing the read does not name: an error boundary per widget, so a chart throwing never takes the page down, and a small observability layer (web vitals and a typed event log). The brief scores performance and observability, so they get a home (section 11).

## 2. Layering and dependency rule

```
src/app/           Next.js routes, layouts, route handlers       (may import features, components, domain, lib)
src/features/      data-aware screens per user flow              (may import components, domain, lib)
src/components/    design system: primitives, charts, components (may import lib only)
src/lib/           framework glue: context hook, stream client, format, telemetry (may import domain)
src/domain/        types, schema, selectors, resolvers, rules    (may import nothing but zod)
```

Enforced by an ESLint `no-restricted-imports` rule per folder, so the boundary is tested, not promised.

## 3. Folder tree

Layout approved by Flavius on 2026-11-02 (see design/layout-proposal.md): everything under `src/`, one file per concept inside `domain/` and `lib/`, shadcn primitives at their default `components/ui/`.

```
src/
  app/
    layout.tsx               html[data-theme], fonts, tokens.css, providers, nuqs adapter, skip link
    page.tsx                 server: loads data, reads searchParams, renders the shell + regions
    providers.tsx            QueryClientProvider, NuqsAdapter
    api/chat/route.ts        the reference SSE handler, typed with domain/stream; picks the fixture for the view (lib/stream/pickFixture.ts)
    api/alerts/route.ts      GET list, POST upsert, DELETE; in-memory store; ?fail=1 switch
    api/vitals/route.ts      204 sink for web vitals
    tokens.css               every CSS variable, light + dark (from design-system.md)
    globals.css              Tailwind v4 @theme mapping tokens to utilities
  domain/                    pure, zod only, one file per concept
    dataset.ts               zod schema for data.json, parseDataset, Dataset/Market/Fact/Kpis/Anomaly,
                             Entity, Scope, Period, Context, Provenance, Status, Basis
    periods.ts               ytd, mat, periodsForBasis, latestPeriod, horizon
    scope.ts                 factsFor(scope), entityName, breadcrumbTrail
    metrics.ts               total, attainment, growth, variance, momChange, topMovers, statusCounts
    status.ts                the inferred rule as text only (tooltip + README); never computes status
    citations.ts             Citation → ResolvedTarget | Unresolved; disagreement detection
    alerts.ts                AlertRule schema + evaluateRule → breaching markets
    stream.ts                zod schema for token | done | error SSE events, parseSseLine
    index.ts
  lib/                       app plumbing
    context/                 useConsoleContext, parsers, invariants (market ⇒ region), meta (document title)
    dataset.ts               cached loader around parseDataset
    format.ts                $22.85M, +7.3%, −9.7%, 1,676,586, May 2026, 2026-05
    theme.ts                 data-theme, localStorage try/catch, OS fallback
    density.ts               derived from Context.mode
    roles.ts / role.tsx      mock sign-in: role cookie, personas, RoleProvider (slice 23); src/proxy.ts sets the cookie on a first visit
    events.ts                typed event log (navigate, ask, stop, cite, save, rollback)
    vitals.tsx               web-vitals → console.table in dev, sendBeacon /api/vitals in prod
    stream/                  chatClient (fetch + AbortController + SSE parser), slice 5
  components/                presentational; may not import domain or features
    ui/                      shadcn primitives, restyled with tokens (Button, Badge, Card, Tooltip,
                             Collapsible, Tabs, Table, Input, Select, Textarea, Dialog, Skeleton, Form)
    charts/                  visx chart kit: Frame, Axes, Grid, Tooltip, Legend, Crosshair, useChartKeyboard;
                             LineChart, RadarChart, HeatMap, Choropleth, Sparkline
    Notice.tsx KpiTile.tsx StatusBadge.tsx ConfidenceMeter.tsx CitationChip.tsx ViewAsTable.tsx
    icons.ts                 lucide re-exports with fixed sizes
    cn.ts                    class-name helper
  features/                  screens, one folder per user flow
    shell/                   Header (Breadcrumbs, ContextChips, PeriodSelect, DataStamp, ModeSwitch, ThemeToggle), Layout, ErrorBoundary
    overview/                KpiRow, TopMovers, MapCard (exec screen)
    analyst/                 MarketGrid, TimeSeriesCard, RadarCard, HeatMapCard, BasisSelector, FactsTable (12a)
    assistant/               Panel, Composer, Suggestions, AnswerCard, AnswerList, SourcesTable, useAnswerMachine, useAskWhy
    alerts/                  AlertForm, RuleList, useAlertSave (TanStack mutation), DeleteAlertDialog
    palette/                 CommandPalette (12b)
  data/
    data.json fixtures.json  verbatim from the starter pack
public/geo/markets.json      generated by scripts/build-geo.ts, committed
scripts/
  build-geo.ts               world-atlas 110m → public/geo/markets.json (13 markets + land)
  check-contrast.ts          reads tokens.css, asserts every pair in design-system.md §3
tests/
  unit/                      domain, lib, hooks (Vitest, jsdom)
  e2e/                       Playwright, one spec per slice
.storybook/                  Storybook 9 harness; stories (*.stories.tsx) sit next to their components
docs/                        design documents, decision records, slice specs
```

## 4. Data flow

```
src/data/data.json ──(server, once, cached)──▶ domain.parseDataset ──▶ Dataset (typed)
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
| `mode` | `executive \| analyst` | by role | drives density; absent means the signed-in role's view; the old value `overview` is redirected (308) to `executive` |
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

**Contracts (zod, in `src/domain/dataset, src/domain/stream, src/domain/alerts`)**
- `DatasetSchema`: mirrors CONTRACT.md; refines that `priorYear` matches the earlier actual where present and that every market's region exists. Parsed once; a failure fails the build, not the page.
- `SseEventSchema`: `{type:"token", value}` | `{type:"done", kind, citations, confidence}` | `{type:"error", message}`. Unknown event types are ignored and logged.
- `AlertRuleSchema`: `{id?, metric, comparator:"below", threshold, scope}` with the ranges from domain-model.md section 8; inferred TypeScript types are shared by the form, the route handler and the query cache.

**Answer machine (`src/features/assistant/useAnswerMachine`)**

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

**Alert save machine (`src/features/alerts/useAlertSave`)**

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
| Component | Storybook stories with play functions, run by the Storybook Vitest addon in Chromium; a11y addon fails on violations | every `src/components/` and client `src/features/` component per state; features with mocked streams and mutations |
| E2E | Playwright (+ axe-core/playwright) | one spec per slice from user-flows.md, both themes for slices 1 and 11 |
| Contracts | Vitest | `DatasetSchema` against the real file; `SseEventSchema` against recorded fixture streams |
| Tokens | `scripts/check-contrast.ts` | CI gate |
| Visual | Storybook (slice 0 harness), deployed per PR | per component and state, light and dark via toolbar globals |

| Slice | Folders touched | Primary test |
|---|---|---|
| 0 | domain, src/lib/context, src/app/tokens.css, src/features/shell | unit + contrast |
| 1 | src/features/shell, src/features/assistant (empty state), src/components/ui | E2E cold open |
| 2 | src/features/overview, src/components/charts/Choropleth, scripts/build-geo | E2E tiles and map |
| 3 | src/lib/context, src/features/shell | E2E drill, share, back |
| 4 | src/features/analyst, src/components/charts (Line, Radar, HeatMap, Sparkline) | E2E coordinated views |
| 5 | src/lib/stream, src/features/assistant/useAnswerMachine, Composer | E2E stream and stop |
| 6 | src/domain/citations, CitationChip, context `cite` | E2E citation navigation |
| 7 | SourcesTable, disagreement path | E2E differs |
| 8 | AnswerCard states, Notice | E2E low, abstain, error |
| 9 | useAskWhy, TopMovers, MarketGrid | E2E ask why |
| 10 | src/features/alerts, src/app/api/alerts, src/domain/alerts | E2E save and rollback |
| 11 | src/lib/theme, src/lib/density, a11y sweep | E2E axe both themes |
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
- Observability: `src/lib/events` reports LCP, CLS, INP via `web-vitals` to the console in dev and to a no-op route in prod; a typed event log records navigate, ask, token count, stop, cite, save and rollback with timestamps, viewable in a dev-only drawer; each widget sits in an error boundary that renders the inline Notice and logs the error with the Context at the time.

## 12. Questions for Flavius

1. Charts: approve visx (the one decision that shapes the most code), or prefer Recharts for the three it supports and accept two chart systems?
2. Mutations: approve TanStack Query for the alert save only, or keep dependencies lower with `useOptimistic` and a reducer? My advice: TanStack, because it shows the server-versus-client split the brief asks about in a way a reviewer recognises.
3. Deploy target: Vercel, assuming you have an account? The SSE route needs the Node runtime, which Vercel supports by default.
