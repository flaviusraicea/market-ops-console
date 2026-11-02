# Slice 0: Foundation. Spec

Approved inputs: design-system.md, domain-model.md (incl. §13), user-flows.md (slice 0), architecture.md. Build exactly this. Where this spec is silent, raise it as an open question; do not decide.

## 0. Outcome

A Next.js App Router repo that boots to a page showing the header shell (wordmark, breadcrumbs at Portfolio, period, data stamp, mode switch, theme toggle) over an empty dashboard area and an empty assistant panel area, with the domain layer, contracts, URL context hook, tokens and the test harness in place and green. No widgets yet.

## 1. Repository and toolchain

- Repo: `https://github.com/flaviusraicea/market-ops-console` (exists, public, empty), default branch `main`. Clone it and work there from the first commit; the branch and PR rules are in section 12.
- Package manager: `pnpm` (lockfile committed). Node: current LTS (22.x). Record both in `README.md` "Quick setup" and in `package.json` `engines`.
- Scaffold: `pnpm create next-app@latest` with TypeScript, ESLint, Tailwind, App Router, `src/` directory **off** (folders at the root as in architecture.md §3), import alias `@/*`.
- Install (exact packages; use the latest stable of each and pin in package.json):
  - runtime: `zod`, `nuqs`, `@tanstack/react-query`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss` (v4), `@tailwindcss/postcss`
  - charts (install now, unused until slice 2): `@visx/scale @visx/shape @visx/axis @visx/grid @visx/group @visx/tooltip @visx/event @visx/geo @visx/responsive`, `d3-geo`, `topojson-client`, `world-atlas`, `@types/d3-geo @types/topojson-client @types/geojson`
  - dev: `vitest @vitejs/plugin-react @vitest/browser jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`, `@playwright/test @axe-core/playwright playwright`, `eslint-plugin-boundaries` (or `eslint-plugin-import` with `no-restricted-paths`), `prettier`, `tsx`
  - Storybook (section 10.0): `storybook @storybook/nextjs-vite @storybook/addon-vitest @storybook/addon-a11y @storybook/addon-docs eslint-plugin-storybook` (Storybook 9.x; install through `pnpm dlx storybook@latest init`, see 10.0). No `jest-axe`: accessibility assertions on components come from the Storybook a11y addon, and page-level ones from Playwright axe.
- shadcn/ui: `pnpm dlx shadcn@latest init` with style "new-york", base colour neutral, CSS variables **on**, then `add button badge card tooltip collapsible tabs table input select textarea dialog skeleton form`. The generated `src/components/ui/*` files are moved to `src/components/ui/` and the shadcn config `aliases` updated to match. Their colour classes are re-pointed at our tokens in slice 0 (section 5) so no shadcn default colour survives.
- `tsconfig.json`: paths `@/*` → `./src/*`; `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`. The ESLint config adds `@typescript-eslint/no-explicit-any: "error"` and `@typescript-eslint/consistent-type-imports`.
- Scripts in `package.json`: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`, both Vitest projects: `unit` and `stories`), `test:unit` (`vitest run --project unit`), `test:stories` (`vitest run --project stories`), `test:watch`, `test:e2e` (playwright test), `storybook` (`storybook dev -p 6006`), `build-storybook` (`storybook build`, output `storybook-static/`), `check:contrast` (`tsx scripts/check-contrast.ts`), `build:geo` (`tsx scripts/build-geo.ts`, slice 2), `ci` (`pnpm lint && pnpm typecheck && pnpm check:contrast && pnpm test && pnpm build && pnpm build-storybook`).
- `.github/workflows/ci.yml`: one job named `ci`, on push and pull request, Node 22, pnpm cache. Steps: install, `pnpm exec playwright install --with-deps chromium` (needed by the `stories` project as well as E2E), `pnpm ci`, `pnpm test:e2e`. Upload `playwright-report/` as an artifact on failure.
- Prettier default config plus `printWidth: 100`. Commit as the first commit: "chore: scaffold console".

## 2. Folder layout (create every folder now, with an `index.ts` where listed)

```
src/
  app/ layout.tsx page.tsx providers.tsx tokens.css globals.css
       api/chat/route.ts        (copy reference/chat-route.ts verbatim, import from "@/data/fixtures.json")
       api/vitals/route.ts
  domain/ index.ts dataset.ts periods.ts scope.ts metrics.ts status.ts citations.ts alerts.ts stream.ts
          (pure, zod only; one file per concept, no subfolders)
  lib/ context/{useConsoleContext,parsers,invariants}.ts context/meta.tsx
       dataset.ts format.ts theme.ts density.ts events.ts vitals.tsx
       stream/ (empty, slice 5)
  components/ ui/ (shadcn primitives, restyled)  charts/ (empty, slice 2)  Notice.tsx  icons.ts  cn.ts
  features/ shell/{Header,Breadcrumbs,ContextChips,PeriodSelect,DataStamp,ModeSwitch,ThemeToggle,ErrorBoundary,Layout}.tsx
            overview/ analyst/ assistant/ alerts/ palette/   (empty folders with .gitkeep)
  data/ data.json fixtures.json   (copied verbatim from the starter pack)
scripts/ check-contrast.ts
tests/ unit/ e2e/  setup.ts
.storybook/ main.ts preview.tsx decorators.tsx vitest.setup.ts
*.stories.tsx live next to the component they document (src/components/**, src/features/**); there is no tests/component/ folder.
```

ESLint boundary rule (enforced):
- `src/domain/**` may import only `zod` and itself.
- `src/lib/**` may import `domain`, `lib`, `nuqs`, `react`, `next`, `web-vitals`.
- `src/components/**` may import `lib`, `components`, react, lucide, shadcn deps, visx, d3. **Not** `domain` or `features`.
- `src/features/**` may import `domain`, `lib`, `components`, `features`, react, next, tanstack.
- `src/app/**` may import anything.
- `*.stories.tsx` files and `.storybook/**` may additionally import `storybook`, `@storybook/*`, `storybook/test`, `@tanstack/react-query`, `nuqs/adapters/testing` and `src/data/*.json`; otherwise a story follows the rules of the folder it sits in (a story in `src/components/` still may not import `src/domain/` or `src/features/`; it gets any dataset-derived props from `.storybook/decorators.tsx` or inline literals).
Add a unit test `tests/unit/boundaries.test.ts` that runs ESLint programmatically on a fixture file in `src/components/` importing from `src/domain/` and asserts it errors.

## 3. Domain contracts (schemas live in the concept files: `src/domain/dataset.ts`, `src/domain/stream.ts`, `src/domain/alerts.ts`)

### 3.1 `dataset.ts` (schema part)
```ts
import { z } from "zod";
export const PeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).brand<"Period">();
export type Period = z.infer<typeof PeriodSchema>;
export const RegionIdSchema = z.enum(["na", "eu", "apac", "latam"]);
export const StatusSchema = z.enum(["on_track", "at_risk", "off_track"]);
export const AnomalySchema = z.object({ period: PeriodSchema, type: z.string(), note: z.string() });
export const KpisSchema = z.object({
  revenue: z.number(), growthPct: z.number(), sharePct: z.number(),
  forecastAttainmentPct: z.number(), status: StatusSchema, anomalies: z.array(AnomalySchema),
});
export const MarketSchema = z.object({ id: z.string(), name: z.string(), iso3: z.string().length(3), iso2: z.string().length(2), regionId: RegionIdSchema, kpis: KpisSchema });
export const ProductSchema = z.object({ id: z.string(), name: z.string() });
export const RegionSchema = z.object({ id: RegionIdSchema, name: z.string() });
export const FactSchema = z.object({ marketId: z.string(), productId: z.string(), period: PeriodSchema, actual: z.number().nonnegative(), forecast: z.number().positive(), units: z.number().nonnegative(), priorYear: z.number().nonnegative() });
export const MetaSchema = z.object({ currency: z.literal("USD"), periods: z.array(PeriodSchema).min(1), latestPeriod: PeriodSchema, generatedAt: z.string().optional() });
export const DatasetSchema = z.object({ meta: MetaSchema, regions: z.array(RegionSchema), products: z.array(ProductSchema), markets: z.array(MarketSchema), series: z.array(FactSchema) })
  .superRefine((d, ctx) => { /* 1) every market.regionId exists in regions; 2) every fact's marketId and productId exist; 3) latestPeriod is the last of periods; 4) series length === markets × products × periods; 5) for every fact whose period minus 12 months is in periods, priorYear === that fact's actual. Add a ctx.addIssue with a path for each failure. */ });
export type Dataset = z.infer<typeof DatasetSchema>; export type Market = ...; export type Fact = ...; export type Kpis = ...; export type Status = ...; export type RegionId = ...;
export function parseDataset(input: unknown): Dataset  // DatasetSchema.parse; throws ZodError
```

### 3.2 `stream.ts`
```ts
export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export const KindSchema = z.enum(["normal", "low_confidence", "abstain", "error"]);
export const CitationSchema = z.object({ marketId: z.string().optional(), regionId: z.string().optional(), productId: z.string().optional(), period: PeriodSchema.optional(), label: z.string().optional() });
export const SseEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("token"), value: z.string() }),
  z.object({ type: z.literal("done"), kind: KindSchema, citations: z.array(CitationSchema), confidence: ConfidenceSchema }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type SseEvent, Citation, Confidence, Kind
export function parseSseLine(line: string): SseEvent | null  // accepts "data: {...}"; returns null for blank, comments (":"), or non-data lines; throws on invalid JSON or schema failure
```

### 3.3 `alerts.ts` (schema part)
```ts
export const AlertScopeSchema = z.union([z.literal("portfolio"), z.object({ regionId: RegionIdSchema }), z.object({ marketId: z.string() })]);
export const AlertRuleSchema = z.object({ id: z.string().optional(), metric: z.enum(["growth", "attainment"]), comparator: z.literal("below"), threshold: z.number(), scope: AlertScopeSchema, createdAt: z.string().datetime().optional() })
  .superRefine((r, ctx) => { growth: threshold in [-100, 100]; attainment: threshold in [0, 100]; otherwise addIssue at path ["threshold"] with message "Enter a value between 0 and 100." for attainment and "Enter a value between −100 and 100." for growth });
export type AlertRule, AlertScope
```

## 4. Domain model and selectors (one file per concept, no subfolders)

### 4.1 `dataset.ts` (types part, same file as 3.1)
```ts
export type Entity = { kind: "portfolio" } | { kind: "region"; regionId: RegionId } | { kind: "market"; marketId: string } | { kind: "product"; marketId: string; productId: string };
export type Basis = "month" | "ytd" | "mat";
export type Scope = { entity: Entity; periods: readonly Period[] };    // periods non-empty, ascending
export type Mode = "overview" | "analyst";
export type Metric = "attainment" | "revenue" | "growth";
export type Context = { region?: RegionId; market?: string; product?: string; period: Period; mode: Mode; metric: Metric; basis: Basis; cite?: number; facts?: boolean };
export type Provenance = "source" | "derived" | "assistant";
export type Totals = { actual: number; forecast: number; priorYear: number; units: number; factCount: number };
```

### 4.2 `scope.ts`
- `factsFor(ds: Dataset, scope: Scope): Fact[]` filters `ds.series` by entity and periods. Market entity matches `marketId`; region matches markets of that region; product matches both; portfolio matches all.
- `entityOf(ctx: Context): Entity` (product if `product`, else market, else region, else portfolio).
- `entityName(ds, entity): string` ("Portfolio", region name, market name, `"${market} · ${product}"`).
- `breadcrumbTrail(ds, ctx): Array<{ label: string; ctx: Partial<Context> }>` → `[Portfolio]`, `[Portfolio, Europe]`, `[Portfolio, Europe, Germany]`, `[Portfolio, Europe, Germany, Veltrix]`.
- `marketsIn(ds, entity): Market[]`.

### 4.3 `periods.ts`
- `latestPeriod(ds): Period`; `horizon(ds): Period` (equals latestPeriod).
- `periodsForBasis(ds, basis, endPeriod): Period[]`: month → `[end]`; ytd → periods from `${year(end)}-01` to end; mat → the 12 periods ending at end, or throws `RangeError("MAT needs 12 periods")` if fewer exist.
- `previousPeriod(ds, p): Period | undefined`; `formatPeriod(p): string` lives in `src/lib/format`, not here.
- `periodIndex(ds, p): number` (−1 if absent); `clampPeriod(ds, p): Period` (unknown → latest).

### 4.4 `metrics.ts` (totals and ratios)
- `totals(facts: Fact[]): Totals` sums.
- `attainmentPct(t: Totals): number` = actual / forecast × 100, rounded to 1 decimal with `Math.round(x*10)/10`; throws if forecast is 0.
- `growthPct(t): number` = (actual / priorYear − 1) × 100, 1 decimal; throws if priorYear is 0.
- `variance(t): number` = actual − forecast (integer USD).
- `momChangePct(ds, entity, period): number | undefined` = actual(p)/actual(p−1) − 1 as %, 1 decimal; undefined if no previous period.
- `kpiFor(ds, entity, period, basis): { totals; attainmentPct; growthPct; variance; provenance: Provenance }` where provenance is `"source"` only when entity is a market, basis is month and period is latest (then attainmentPct and growthPct are taken from `market.kpis`, revenue from `kpis.revenue`); otherwise `"derived"` and computed.

### 4.5 `metrics.ts` (rankings and counts, same file as 4.4)
- `topMovers(ds, n = 3): { rising: Array<{market, growthPct}>; falling: Array<...> }` from `kpis.growthPct`, rising sorted desc, falling sorted asc.
- `statusCounts(ds, entity): { on_track: number; at_risk: number; off_track: number }` over `marketsIn`.
- `attentionCount(ds, entity): number` = at_risk + off_track.

### 4.6 `citations.ts`
```ts
export type ResolvedTarget = { entity: Entity; period: Period; label: string; periodDefaulted: boolean };
export type Resolution = { ok: true; target: ResolvedTarget; disagreement?: { assistant: string; source: Status } } | { ok: false; reason: "unknown_market" | "unknown_region" | "unknown_product" | "unknown_period"; label: string };
export function resolveCitation(ds: Dataset, c: Citation, claimText?: string): Resolution
```
Rules (domain-model.md §6): product + market → product entity; market → market; region → region; none → portfolio. Period missing → latest, `periodDefaulted: true`. Unknown ids → `ok: false`. Disagreement: if `claimText` is given and the entity is a market and the claim contains one of the phrases `"on track" | "at risk" | "off track"` (case-insensitive; also accept `"off-track"`), compare to `market.kpis.status`; if different, set `disagreement`.

### 4.7 `alerts.ts` (evaluator part, same file as 3.3)
`evaluateRule(ds, rule): { breaching: Market[]; total: number }` over `marketsIn(scope)` using `kpis.growthPct` or `kpis.forecastAttainmentPct` at the latest period; breaching when value < threshold; sorted by market name.

### 4.8 `status.ts`
`export const STATUS_RULE_TEXT = "Status is given in the data. It is consistent with: off track when growth is negative or attainment is below about 92.5%; at risk when attainment is below 100%; on track otherwise."` and `export const STATUS_LABEL: Record<Status, string> = { on_track: "On track", at_risk: "At risk", off_track: "Off track" }`.

### 4.9 `src/domain/index.ts` re-exports everything above. **Nothing in `src/domain/` imports React, Next, or anything from `src/lib/`.**

## 5. Tokens and global CSS

- `src/app/tokens.css`: transcribe every token from design-system.md §3.1 (light, Option A values) under `:root`, and §3.2 (dark) under both `:root[data-theme="dark"]` and `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }`. Also the font, type, spacing, radius and motion tokens from §1, §2, §4, §5, with the density switch on `html[data-density="analyst"]`. Reduced motion: both `@media (prefers-reduced-motion: reduce)` and `html[data-reduced-motion="true"]` set every `--dur-*` to `0ms`.
- `src/app/globals.css`: `@import "tailwindcss"; @import "./tokens.css";` then a `@theme inline { --color-bg: var(--bg); --color-surface: var(--surface); --color-surface-2: var(--surface-2); --color-border: var(--border); --color-grid: var(--grid); --color-ink: var(--ink); --color-ink-2: var(--ink-2); --color-ink-muted: var(--ink-muted); --color-ink-disabled: var(--ink-disabled); --color-accent: var(--accent); --color-accent-hover: var(--accent-hover); --color-on-accent: var(--on-accent); --color-accent-soft: var(--accent-soft); --color-focus: var(--focus); --color-ok-text … --color-bad-hover; --color-ai-bg/--color-ai-border/--color-ai-label; --color-series-actual/forecast/prior; --color-cat-1..6; --color-seq-1..7; --color-div-n3..p3; --font-display; --font-ui; --font-mono; --radius-control; --radius-card; --radius-pill; }` so utilities like `bg-surface`, `text-ink-2`, `border-border`, `bg-ai-bg`, `text-ok-text`, `rounded-card` exist.
- `body`: `font-family: var(--font-ui); font-variant-numeric: tabular-nums; font-feature-settings: "cv11", "ss01"; background: var(--bg); color: var(--ink);`.
- `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }` globally; shadcn's ring classes are replaced by this.
- Restyle the shadcn primitives: replace every `bg-background`, `text-foreground`, `border-input`, `ring-*`, `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-destructive`, `text-muted-foreground`, `bg-muted`, `bg-accent` etc. with the token utilities per design-system.md §6.11 (buttons) and the component sections. Remove the shadcn `--background/--foreground/...` variables from `globals.css` entirely. A grep for `hsl(` and for the shadcn variable names must return nothing.
- Fonts: in `src/app/layout.tsx` use `next/font/google` for `Source_Serif_4` (weights 400, 600, `opsz` axis) and `Inter` (400, 500, 600), assigned to CSS variables `--font-display` and `--font-ui` with `display: "swap"` and the fallbacks from design-system.md §1.

## 6. `scripts/check-contrast.ts`

- Parses `src/app/tokens.css` (simple regex over `--name: #hex;` inside each scope), builds the light and dark maps, computes WCAG 2.x contrast, and asserts the pair list below. Exit 1 with a table of failures.
- Pair list, light and dark both: text pairs ≥ 4.5: `ink/surface, ink/bg, ink-2/surface, ink-2/bg, ink-2/surface-2, ink-muted/surface, ink-muted/bg, ink-muted/surface-2, accent/surface, accent/bg, accent/accent-soft, on-accent/accent, ok-text/ok-bg, ok-text/surface, warn-text/warn-bg, warn-text/surface, warn-text/accent-soft, bad-text/bad-bg, bad-text/surface, ai-label/ai-bg, ink/ai-bg, ink/accent-soft, ink/bad-bg, ink-2/bad-bg, on-bad/bad-mark`. Graphic pairs ≥ 3: `ok-mark/surface, warn-mark/surface, bad-mark/surface, bad-mark/bad-bg, focus/surface, series-actual/surface, series-forecast/surface, series-prior/surface, cat-1..6/surface`. Decorative (print only): `border/surface, grid/surface, surface-2/surface, ai-border/ai-bg, bg/surface`.
- Also asserts luminance monotonic for `seq-1..7` and for each arm of `div-n3..p3`.
- Prints the full table on success too (it is pasted into the README's accessibility section later).

## 7. URL context (`src/lib/context`)

- `parsers.ts` with nuqs parsers: `parseAsStringEnum` for region, mode, metric, basis; `parseAsString` for market, product; a custom `parseAsPeriod(ds)` that validates against `meta.periods` and clamps; `parseAsInteger` for cite; `parseAsBoolean` for facts. Defaults from architecture.md §5.
- `useConsoleContext(): { ctx: Context; setContext(partial: Partial<Context>, opts?: { history?: "push" | "replace" }): void; reset(): void }`.
  - Invariants applied in `setContext`: setting `market` sets `region` from the dataset; setting `product` without a `market` in the result throws in dev and is ignored in prod (logged via `src/lib/events`); clearing `region` clears `market` and `product`; clearing `market` clears `product`; changing `period`, `region`, `market`, `product`, `mode` uses `push`; `cite`, `facts`, `metric`, `basis` use `replace`; any change that is not `cite` clears `cite`.
  - Server side: `parseContextFromSearchParams(ds, searchParams): Context` with the same rules, used by `src/app/page.tsx`.
- `src/lib/density.ts`: returns `ctx.mode === "analyst" ? "analyst" : "overview"` and a `useEffect` that writes `data-density` on `<html>`.
- `src/lib/theme.ts`: `theme: "light" | "dark" | "system"`, `resolved`, `setTheme`; writes `data-theme` on `<html>` (removed for system); persists to `localStorage` key `mo.theme` in try/catch; reads on mount; an inline script in `layout.tsx` applies the stored value before paint to avoid a flash.

## 8. Formatting (`src/lib/format.ts`)

- `formatMoneyCompact(n)`: millions with two decimals whenever |n| ≥ 100,000 (`$22.85M`, `$0.94M`, `$0.76M`); below that, full dollars with separators (`$62,818`). Never `K`. Negative → leading `−` (U+2212).
- `formatMoneyFull(n)`: `1,676,586` (no `$`; the column header carries the unit).
- `formatPct(n, { sign }: { sign: boolean })`: one decimal always. With `sign: true`: `+7.3%`, `−9.7%`, and exactly zero renders `0.0%` with no sign. With `sign: false`: `92.0%`.
- `formatPeriod(p)`: `May 2026`; `formatPeriodShort(p)`: `May 26`; `formatCount(a, b)`: `6 of 13`.
- All via `Intl.NumberFormat("en-US")`; locale fixed to en-US for determinism (README notes that a real product would take it from the user).

## 9. Shell (`src/features/shell`) and page

- `src/app/layout.tsx`: `<html lang="en" suppressHydrationWarning>` with the theme pre-paint script, fonts, `globals.css`, `NuqsAdapter`, `QueryClientProvider`, a skip link "Skip to content" to `#main`.
- `src/app/page.tsx` (server): `const ds = getDataset()` (a `cache()`d function in `src/lib/dataset.ts` that `parseDataset`s the JSON import once), `const ctx = parseContextFromSearchParams(ds, await searchParams)`, renders `<Layout header={<Header ds-derived props />}><main id="main">…two empty regions with headings "Dashboard" and "Assistant" (visually hidden h2s)…</main></Layout>`.
- `Header` (client island) per design-system.md §6.1: props `{ trail, period, periods, latestPeriod, mode }`; children `Breadcrumbs` (nav + ol + aria-current), `ContextChips` (period chip with clear → sets period to latest; product chip when present), `PeriodSelect` (shadcn Select listing `meta.periods` newest first, labelled "Period"), `DataStamp` (`DATA THROUGH MAY 2026` from `latestPeriod`, with `title`), `ModeSwitch` (radiogroup, arrow keys), `ThemeToggle` (aria-label swaps). All writes go through `setContext`.
- `ErrorBoundary`: class component rendering the Notice (design-system.md §6.12) with title "This widget failed to load", body "The rest of the console still works.", secondary "Reload widget" that resets the boundary; logs via `src/lib/events`.
- `src/lib/vitals.tsx`: `reportWebVitals` via Next's `useReportWebVitals` in a client component mounted in layout; dev → `console.table`; prod → `navigator.sendBeacon("/api/vitals")` where `src/app/api/vitals/route.ts` returns 204. `events.ts`: `logEvent(e: ConsoleEvent)` with a discriminated union `{ type: "navigate", ctx } | { type: "widget_error", widget, message } | …` (extend per slice); stores the last 200 in memory and `console.debug`s in dev.

## 10. Tests written first (all must exist and pass before the slice is done)

`tests/setup.ts`: jest-dom matchers (used by the `unit` project).

### 10.0 Storybook is the component test harness (approved by Flavius, 2026-11-02)

Component and integration tests are stories with play functions, run by the Storybook Vitest addon in a real Chromium through Vitest browser mode. Pure logic stays in plain Vitest; page flows stay in Playwright. Set it up now so every later slice only adds stories.

- Install: `pnpm dlx storybook@latest init` in the scaffolded repo. Accept the Next.js + Vite framework (`@storybook/nextjs-vite`), the Vitest addon and the a11y addon. Delete the generated example stories. Whatever the wizard produces, the end state is the configuration below.
- `.storybook/main.ts`: `framework: "@storybook/nextjs-vite"`, `stories: ["../src/components/**/*.stories.tsx", "../src/features/**/*.stories.tsx"]`, addons `@storybook/addon-vitest`, `@storybook/addon-a11y`, `@storybook/addon-docs`. `staticDirs: ["../public"]`.
- `.storybook/preview.tsx`: imports `src/app/globals.css` (so tokens and the Tailwind theme apply); `parameters.a11y = { test: "error" }` so any axe violation fails the story's test; `parameters.backgrounds` off (our `body` background is the real one); global types `theme` (light | dark) and `density` (overview | analyst) and `reducedMotion` (off | on) with toolbar items; a decorator that writes `data-theme`, `data-density` and `data-reduced-motion` on `document.documentElement` from those globals (removing the attribute for light / overview / off). `initialGlobals: { theme: "light", density: "overview", reducedMotion: "off" }`. Fonts: the `next/font` variables are not available in Storybook; preview sets `--font-display` and `--font-ui` on `:root` to the fallback stacks from design-system.md §1 and documents this in a comment.
- `.storybook/decorators.tsx`: `withProviders` wraps every story in `QueryClientProvider` (fresh `QueryClient` per story, `retry: false`) and `NuqsTestingAdapter` from `nuqs/adapters/testing` with `searchParams` from `parameters.nuqs?.searchParams ?? ""` and `onUrlUpdate` pushed to a `fn()` spy exposed on `parameters.nuqs.onUrlUpdate` so play functions can assert URL writes. `withDataset` exposes `ds = parseDataset(data.json)` through a React context for stories under `src/features/`; `src/components/` stories never use it. `withProviders` is a global decorator; `withDataset` is applied per story file.
- `.storybook/vitest.setup.ts`: `setProjectAnnotations` with the preview annotations and the addon-a11y annotations, as the wizard writes it.
- `vitest.config.ts` with two projects:
  - `unit`: `environment: "jsdom"`, `include: ["tests/unit/**/*.test.ts?(x)"]`, `setupFiles: ["tests/setup.ts"]`, `@/*` → `src/*` alias.
  - `stories`: the Storybook plugin `storybookTest({ configDir: ".storybook" })` from `@storybook/addon-vitest/vitest-plugin`, `browser: { enabled: true, provider: "playwright", headless: true, instances: [{ browser: "chromium" }] }`, `setupFiles: [".storybook/vitest.setup.ts"]`.
  - Dark theme coverage: if the plugin accepts it within the timebox, add a third project `stories:dark` identical to `stories` with `define: { "import.meta.env.SB_THEME": '"dark"' }` and make preview's `initialGlobals.theme` read `import.meta.env.SB_THEME ?? "light"`. If it does not, run stories in light only and rely on slice 11's Playwright axe runs for dark; say which in the report.
- Story conventions (every later slice follows them):
  - File `X.stories.tsx` next to `X.tsx`; `title` is the folder path (`src/components/KpiTile`, `src/features/shell/Header`); one story per state the design system lists for that component, named after the state (`Default`, `Negative`, `Flat`, `Streaming`, `Stopped`, `Unresolved`, `Dark` is never a story: dark is a global).
  - Assertions live in `play` using `storybook/test` (`within`, `userEvent`, `expect`, `fn`). Each play function asserts exactly what the slice spec lists for that component; a story with no listed assertion has no play function and is still a test because the a11y addon runs on it.
  - Props that are callbacks are `fn()` args so play functions can `expect(args.onSelect).toHaveBeenCalledWith(...)`.
  - Chart stories use inline fixture data (a 2-feature geo, 24 points for one market) given in the slice spec; they never read `data.json` directly.
  - A story must render without network: anything that fetches gets its data as props or through a decorator.
- Guardrails (both approved):
  1. **Timebox: one working day** of implementer effort to get `pnpm test:stories` green locally and in CI with the `Header` stories of 10.8. If it is not green by then, stop, report the blocker, and fall back to Testing Library tests under `tests/component/` with the same assertions while stories stay render-only. Do not spend more time on Storybook plumbing than that without a decision.
  2. **Scope: stories only for `src/components/**` and client components in `src/features/**`.** Domain selectors, contracts, hooks, route handlers and formatters stay in the `unit` project. User journeys stay in Playwright E2E. Server components get no stories.
- Deployment: Storybook builds to `storybook-static/` and is deployed as a second Vercel project (`market-ops-console-storybook`, same repo, build command `pnpm build-storybook`, output directory `storybook-static`). Flavius creates it alongside the app project (or the implementer if given access); its URL goes in the README and in every PR description under "## Screenshots" next to the preview URL.
- README (slice 0 "Quick setup") adds `pnpm storybook` and the line "Component tests are Storybook stories with play functions; `pnpm test:stories` runs them headless in Chromium."

### 10.1 `tests/unit/contracts.test.ts`
- parses `src/data/data.json`: 4 regions, 13 markets, 5 products, 24 periods, 1,560 facts; `latestPeriod === "2026-05"`.
- a copy with `markets[0].regionId = "xx"` fails with an issue at path `["markets", 0, "regionId"]`.
- a copy with one fact's `priorYear` changed fails with an issue mentioning `priorYear`.
- `parseSseLine('data: {"type":"token","value":"Three "}')` → `{type:"token", value:"Three "}`; blank line → null; `': ping'` → null; `'data: {"type":"nope"}'` throws.
- `AlertRuleSchema`: attainment 120 fails with message "Enter a value between 0 and 100."; growth −150 fails; growth −100 and attainment 0 pass.

### 10.2 `tests/unit/selectors.test.ts` (exact values)
- Germany, month, 2026-05: totals actual 1,676,586, forecast 1,817,644, priorYear 1,857,237; `attainmentPct` 92.2; `growthPct` −9.7; `kpiFor` provenance `"source"` with attainmentPct 92.0 (from kpis).
- Germany, 2026-03: actual 1,211,930, forecast 1,314,025; `momChangePct` −27.2.
- Germany × Veltrix, 2026-03: actual 427,196, forecast 461,648, priorYear 603,279.
- Portfolio, month 2026-05: actual 22,850,419, forecast 22,748,448, priorYear 21,294,644; attainment 100.4; growth 7.3; variance 101,971; provenance `"derived"`.
- Portfolio YTD (2026-01..05): actual 110,210,757, forecast 110,040,590, priorYear 103,900,359; attainment 100.2; growth 6.1.
- Portfolio MAT ending 2026-05: 12 periods 2025-06..2026-05; actual 277,150,778, forecast 277,116,484, priorYear 261,136,404.
- Europe, month 2026-05: actual 7,057,380, forecast 7,398,806, priorYear 6,937,825; attainment 95.4; growth 1.7.
- Europe YTD: actual 34,288,077, forecast 36,065,499; Europe MAT: actual 88,027,864, forecast 92,685,940.
- APAC month: actual 9,491,556, forecast 9,051,254; attainment 104.9; growth 11.5.
- `periodsForBasis(mat, "2025-04")` throws RangeError; `periodsForBasis(mat, "2025-05")` returns 12 periods starting "2024-06".
- `topMovers`: rising `[cn 18.2, fr 11.6, ca 10.7]`, falling `[de −9.7, es −4.6, it 0.3]`.
- `statusCounts(portfolio)` → `{on_track: 7, at_risk: 4, off_track: 2}`; `attentionCount` 6; `statusCounts(eu)` → `{on_track: 0, at_risk: 3, off_track: 2}`.
- `breadcrumbTrail` for `{region: eu, market: de, product: veltrix}` → labels `["Portfolio","Europe","Germany","Veltrix"]`.

### 10.3 `tests/unit/citations.test.ts`
- `{marketId:"de", productId:"veltrix", period:"2026-03"}` → ok, product entity, period not defaulted.
- `{regionId:"apac", period:"2026-05"}` → ok, region entity.
- `{marketId:"de"}` → ok, period "2026-05", `periodDefaulted: true`.
- `{marketId:"xx"}` → `{ok:false, reason:"unknown_market"}`.
- `{marketId:"de", period:"2026-05"}` with claimText "Germany is at risk" → disagreement `{assistant:"at risk", source:"off_track"}`; with claimText "Germany is off track" → no disagreement; `{marketId:"it"}` with "Italy is at risk" → no disagreement.

### 10.4 `tests/unit/alerts.test.ts`
- rule attainment below 95, scope `{regionId:"eu"}` → breaching `[Germany, Italy, United Kingdom]` (sorted by name), total 5.
- rule growth below 0, scope portfolio → `[Germany, Spain]`.
- rule attainment below 90, scope `{marketId:"de"}` → `[]`, total 1.

### 10.5 `tests/unit/context.test.ts`
- `parseContextFromSearchParams(ds, {market:"de"})` → region "eu", period "2026-05", mode "overview".
- `{period:"2030-01"}` → period clamps to "2026-05"; `{product:"veltrix"}` alone → product dropped.
- `{region:"eu", market:"de", product:"veltrix", period:"2026-03", mode:"analyst"}` → round-trips.

### 10.6 `tests/unit/format.test.ts`
- `formatMoneyCompact(22850419)` → `$22.85M`; `(940564)` → `$0.94M`; `(62818)` → `$62,818`; `formatPct(-9.7,{sign:true})` → `−9.7%` (U+2212); `formatPct(92,{sign:false})` → `92.0%`; `formatPeriod("2026-05")` → `May 2026`; `formatCount(6,13)` → `6 of 13`.

### 10.7 `tests/unit/boundaries.test.ts` as in section 2.

### 10.8 `src/features/shell/Header.stories.tsx`
- Stories `Portfolio` (trail of one item) and `Germany` (Portfolio › Europe › Germany), both with `parameters.nuqs.searchParams` matching the trail.
- `Germany` play: breadcrumb list has 3 items, the last with `aria-current="page"` and text "Germany"; the stamp reads "DATA THROUGH MAY 2026" (text content, case-insensitive match on "Data through May 2026"); the mode radiogroup has Overview checked; Arrow Right moves the check to Analyst and the nuqs `onUrlUpdate` spy received a URL containing `mode=analyst`; the theme toggle's name is "Switch to dark theme" under light.
- The a11y addon passes on both stories (automatic, `test: "error"`).

### 10.9 `tests/e2e/slice0.spec.ts`
- `/` responds 200; the h1 reads "Market Ops"; the stamp is visible; `html` has no `data-theme` attribute when the browser prefers light and no storage; clicking the theme toggle sets `data-theme="dark"` and reload keeps it; `/?mode=analyst` renders `html[data-density="analyst"]`; axe on `/` has zero violations in light and dark (use `colorScheme` in the Playwright context).

## 11. Definition of done

- `pnpm ci` is green locally and in CI; `pnpm check:contrast` prints the full table with no failures; `pnpm test:stories` runs the Header stories in Chromium and passes; `pnpm storybook` shows them with working theme and density toolbar switches.
- `pnpm dev` shows the shell at `/`, with working breadcrumbs (only Portfolio for now), period select, stamp, mode switch (changes density visibly: header height 56 → 48 px), theme toggle (persists), and two empty labelled regions.
- No `any`, no shadcn default colours, no raw hex outside `tokens.css` (and the font fallback line in `.storybook/preview.tsx`), no React in `src/domain/`, no `tests/component/` folder.
- README has only "Quick setup" so far (pnpm, node, scripts) and a line "Design and architecture documents live in `/docs` (copied from the design folder)": copy design-system.md, domain-model.md, user-flows.md, architecture.md into `docs/` in the repo.
- Report back: the commit hash, the contrast table, and anything that deviated from this spec with the line reference.

## 12. Git workflow (approved by Flavius, 2026-11-02)

- Repository: `https://github.com/flaviusraicea/market-ops-console` (public). Default branch `main`.
- One branch and one pull request per slice, named `slice/NN-name` (`slice/00-foundation`, `slice/01-cold-open`, …). Small Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`), each commit building and passing lint.
- Merge method: **merge commits only**. Never squash, never rebase-merge. Flavius reviews and merges every PR himself; the implementer never merges.
- Branch protection on `main` (Flavius sets it in the repo settings; the implementer raises it if it is missing): require a pull request, require the `ci` status check green, no force pushes.
- CI: `.github/workflows/ci.yml` as in section 1 runs on every PR and on `main`.
- Vercel: the project is linked to the repo so every PR gets a preview deployment and `main` deploys to production. The Vercel project is created by Flavius (or by the implementer if given access); the preview URL goes in the PR description.
- `.github/pull_request_template.md` with exactly these headings: `## Slice`, `## What changed`, `## Why` (link to the spec file in `docs/specs/`), `## Screenshots` (light and dark), `## Accessibility checks`, `## Deviations from spec`, `## Tests added`.
- The first PR (slice 0) copies exactly these design documents into `docs/` (approved by Flavius, 2026-11-02), and nothing else from the design folder:
  - `docs/domain-model.md`, `docs/user-flows.md`, `docs/architecture.md`, `docs/design-system.md` (as they are).
  - `docs/decisions/` from `tech-decisions.md`, reshaped as short ADRs (one file per decision: context, options, decision, consequences; `0001-nextjs-app-router.md`, `0002-visx-charts.md`, `0003-url-state-nuqs.md`, `0004-tanstack-query-alerts-only.md`, `0005-shadcn-restyled-tokens.md`, `0006-storybook-component-tests.md`, plus one per remaining decision in that file).
  - `docs/specs/slice-NN-*.md` with every slice spec.
  - `docs/industry-research.md`, trimmed to the 15 design aspects and the products they came from (drop process notes).
  - NOT copied: `research/`, drafts, `preview-spec.md` and its addenda, `error-states-spec.md`, `color-options.md`, the HTML previews, screenshots and implementation reports.
  - `docs/README.md` opens with one sentence: these are the working documents behind the build, drafted with AI assistance and reviewed and decided by Flavius; it then lists the files. That sentence is the only place the process is described; it is Flavius's own wording choice and does not conflict with the attribution rule above.
- Tag `v0.1.0` on `main` after slice 11 is merged and deployed; release notes list the slices.

## 13. Open questions

- Create the second Vercel project for Storybook (section 10.0, Deployment) or give the implementer access to do it. Not blocking: the implementer can finish slice 0 without it and add the URL to the README in a later PR.
