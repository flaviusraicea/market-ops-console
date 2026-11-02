# Slice 1: Reviewer cold open. Spec

Depends on slice 0. Inputs: design-system.md §6.1, §6.5 (panel header, composer, suggestions), §6.7; user-flows.md slice 1; architecture.md §8.

## 1. Outcome
`/` renders the full shell, an Overview dashboard area with skeleton placeholders where slice 2 widgets will go, and the assistant panel in its empty state with three suggestion chips. Layout, skip link, skeletons and the assistant's empty state are done and tested.

## 2. Files
- `src/features/shell/Layout.tsx`: page grid per design-system.md §4: max width 1280, 24 px gutters (16 below 1024), at ≥ 1024 a two-column grid `minmax(0,1fr) 380px` with gap `--gap`; below 1024 one column with the assistant after the dashboard. `main#main` wraps both regions. Regions: `<section aria-labelledby="dashboard-h">` and `<aside aria-labelledby="assistant-h">` with visually hidden h2s "Dashboard" and "Assistant".
- `src/features/overview/OverviewSkeleton.tsx`: four KPI skeleton tiles in a row (2 × 2 below 768), a map skeleton (aspect 16:9 rectangle) and a top-movers skeleton (6 lines). `aria-busy="true"` and `<span class="sr-only">Loading dashboard</span>`. Slice 2 replaces it with real widgets; keep the file as the Suspense fallback.
- `src/features/assistant/Panel.tsx` (client): card per §6.5 header row (eyebrow ASSISTANT with `sparkles` 14 px in `--ai-label`; right caption "Answers are AI-generated. Numbers link to source."). Body: `AnswerList` (empty for now, renders `EmptyState`), then `Composer`.
- `src/features/assistant/EmptyState.tsx`: one sentence in `--text-body` `--ink-2`: "Ask about markets, products or periods. Answers cite the data they use." followed by `Suggestions`.
- `src/features/assistant/Suggestions.tsx`: three chips (style: pill, `--surface-2` bg, `--ink-2` text, `--text-label`, height `--chip-h`) as `<button>`s labelled exactly `Which markets are at risk?`, `Why did Germany dip?`, `What will sales be next year?`. Clicking calls `onPick(text)` which fills the composer and focuses it (sending comes in slice 5; for now it only fills).
- `src/features/assistant/Composer.tsx`: `<form>` with `<label class="sr-only" for="ask">Ask the assistant</label>`, `<textarea id="ask" rows=1 placeholder="Ask about markets, products or periods…">` auto-growing to 4 rows max, and a primary icon button `Send` (`arrow-up` 18 px) with `aria-label="Send"`. Enter sends, Shift+Enter inserts a newline. `disabled` prop for later. Submitting in this slice calls `onSubmit(question)` and, until slice 5, the Panel's handler does nothing except `logEvent({type:"ask", question})`.
- `src/app/page.tsx`: renders `<Layout>` with `<Suspense fallback={<OverviewSkeleton/>}>` around an `<Overview/>` server component that, in this slice, returns the same skeleton markup without `aria-busy` (so the structure exists), and `<Panel/>` in the aside.

## 3. Tests first
- `src/features/assistant/Panel.stories.tsx`: story `Empty` (`onSubmit: fn()`). Play: the eyebrow text "Assistant" is present; exactly three suggestion buttons with the exact labels; clicking the second fills the textarea with "Why did Germany dip?" and focuses it; Enter in the textarea calls `onSubmit` with the value and Shift+Enter does not. A11y addon passes.
- `src/features/overview/OverviewSkeleton.stories.tsx`: story `Loading`. Play: the root has `aria-busy="true"` and its text contains no digit characters.
- `tests/e2e/slice1.spec.ts`: on `/`: h1 "Market Ops"; stamp text matches /data through may 2026/i; the mode radio "Overview" is checked; three suggestion buttons by exact name; Tab order on `/` (Portfolio, latest period, so the current crumb is not a link and no period chip is shown): skip link → period select → mode "Overview" → theme toggle; the wordmark is a plain h1 and is skipped. Then on `/?period=2026-03&market=de`: skip link → breadcrumb "Portfolio" → "Europe" → "Clear period" → period select → mode → theme, each with a visible outline (assert `outline-style` ≠ none on `:focus-visible` via `getComputedStyle`); at 390 px width the aside's top is below the section's bottom; `colorScheme: "dark"` context with no storage → `html` has no `data-theme` and body background is `rgb(22, 21, 18)`; axe zero violations light and dark.

## 4. Done when
Tests green, `pnpm ci` green, screenshot of `/` at 1440 light and dark attached to the report.
