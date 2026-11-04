# Ledger design system (final spec)

Approved by Flavius on 2026-11-02: Direction A "Ledger, sharpened" (light default, designed dark theme following the OS setting with a header toggle), the error-state treatment, and the sources tables. This file supersedes preview-spec.md for tokens and components; preview-spec.md section 9 remains the source of sample data, and design/ledger-preview.html is the rendered reference.

## 0. Principles the system encodes

1. Facts and interpretation live on different surfaces. Source data: white cards with a provenance caption. Assistant: tinted lilac card, full border, serif voice, citation chips. Nothing moves between them.
2. Colour is spent on meaning only. One accent for interaction and the forecast line; red, amber and green only for status, errors and the alert form; a separate lilac only for the assistant. Everything else is ink on paper.
3. Nothing is colour-only. Status has text, deltas have signs, confidence has a word, disagreement has an icon and hidden text, series have dash patterns and a legend, every chart has a table one click away.
4. Two depths from one token set. Overview and Analyst switch density tokens, never components. Mode lives in the URL.
5. Calm. No flashing, no loops except the streaming caret and the skeleton shimmer, and both stop under reduced motion.
6. Every token is verified. Text at 4.5:1, marks at 3:1, in both themes; the runtime token sheet in the preview proves it and the same check runs in CI.

## 0.1 Settled questions from the preview rounds

- Focus ring always equals the accent: `--focus: #174A94` light, `#8DB4E8` dark.
- Inset wells and table header rows use `--surface-2 #E8E3D8` (1.28:1 vs white cards). `--ink-muted` darkened to `#66615A` so captions on wells stay at 4.92:1.
- `--bad-hover` and `--on-bad` are tokens. Dark `--on-bad` is `#0F1318`.
- Danger buttons exist for destructive confirms only (delete an alert). Never for Retry.
- Chart viewBox follows the container width; strokes and type sizes are fixed pixels. Keep this approach.
- The anomaly marker is a separate focusable SVG layer over the `role="img"` chart. Keep.
- Citation chip `aria-label` uses the chip's visible wording.
- Form specimen labels and values as in 6.13.

## 0.2 Implementation mapping (Next.js, Tailwind v4, shadcn/ui)

- Tokens are CSS custom properties in `app/tokens.css`, exactly the names below, with the dark block under both `:root[data-theme="dark"]` and the `prefers-color-scheme` media query guarded by `:not([data-theme="light"])`. Tailwind v4 `@theme` maps them to utilities (`bg-surface`, `text-ink-2`, `border-border`, `text-accent`, `bg-ai`, `text-ok` …). No raw hex outside `tokens.css`.
- Density: `html[data-density]` switches the spacing tokens; components use `p-[var(--pad-card)]` style utilities or the mapped `p-card`.
- shadcn components are restyled through the token map only: Button (primary, secondary, ghost, danger), Badge (status), Card, Table, Tabs/segmented (mode switch), Tooltip, Collapsible (Show sources), Form + Input + Select, Textarea, Dialog (confirm delete), Command (cmd-K, stretch), Skeleton, Sonner-style toast is **not** used: errors are inline Notices.
- Icons: lucide-react, stroke 1.75, sizes 12 / 14 / 16 / 18 / 20 as specified per component.
- A script `scripts/check-contrast.ts` reads `tokens.css` and asserts every pair listed in section 3; it runs in CI and is mentioned in the README.

## 1. Fonts

Load from Google Fonts with one `<link>`:
`https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Inter:wght@400;500;600&display=swap`

```css
--font-display: "Source Serif 4", Georgia, "Times New Roman", serif;
--font-ui: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

- All numbers, everywhere, use `font-variant-numeric: tabular-nums;` (set it on `body`; it inherits).
- Inter gets `font-feature-settings: "cv11", "ss01";` on body (single-storey a and open digits). If the browser lacks them nothing breaks.
- Display serif is used only for: the wordmark, the page and section titles, and the assistant's answer body text (section 6). Everything else is Inter.

## 2. Type scale

| Token | Family | Size / line | Weight | Letter-spacing | Use |
|---|---|---|---|---|---|
| `--text-display` | display | 32 / 38 px | 600 | -0.01em | Page title in the preview only |
| `--text-title` | display | 22 / 28 px | 600 | -0.005em | Section titles, widget titles |
| `--text-kpi` | ui | 28 / 32 px | 600 | -0.01em | KPI headline number |
| `--text-kpi-dense` | ui | 22 / 26 px | 600 | -0.01em | KPI number in Analyst density |
| `--text-body` | ui | 14 / 20 px | 400 | 0 | Default body, Overview density |
| `--text-body-dense` | ui | 13 / 18 px | 400 | 0 | Body in Analyst density, all table cells |
| `--text-answer` | display | 16 / 24 px | 400 | 0 | Assistant answer body (both densities) |
| `--text-label` | ui | 12 / 16 px | 500 | 0 | Secondary labels, chips, deltas, legend |
| `--text-caption` | ui | 11 / 14 px | 600 | 0.06em | Uppercase eyebrow labels, provenance lines, column headers |
| `--text-mono` | mono | 12 / 16 px | 400 | 0 | Period ids like `2026-03` inside tooltips and the sources table |

Caption text is `text-transform: uppercase`. Nothing else is uppercase.

## 3. Colour tokens

Define on `:root` (light). Redefine the same names under `:root[data-theme="dark"]` and under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }`. Never use a raw hex in a component rule; only `var(--…)`.

Every ratio below is WCAG 2.x contrast, computed and checked. Text tokens meet 4.5:1 on the surfaces they are specified for; graphic marks meet 3:1; decorative borders have no requirement and are listed for completeness.

### 3.1 Light theme

**Neutrals**

| Token | Hex | Role | Verified contrast |
|---|---|---|---|
| `--bg` | `#E6E1D3` | Page background, warm paper one step darker so white cards lift | see `docs/accessibility.md` |
| `--surface` | `#FFFFFF` | Cards, table, header | — |
| `--surface-2` | `#E8E3D8` | Inset wells, table header row, skeletons | decorative; ratios in `docs/accessibility.md` |
| `--border` | `#CFC6B3` | All 1 px borders; shadow is never the only edge | see `docs/accessibility.md` |
| `--grid` | `#E3DED3` | Chart grid lines only | 1.34:1 vs surface (decorative) |
| `--ink` | `#1C1A17` | Primary text, headline numbers, the "actual" line | see `docs/accessibility.md` |
| `--ink-2` | `#5B574F` | Secondary text | see `docs/accessibility.md` |
| `--ink-muted` | `#66615A` | Captions, provenance, axis labels, placeholders | see `docs/accessibility.md` |
| `--ink-disabled` | `#8E887C` | Disabled control text only | 3.52:1 on surface (allowed: disabled) |

**Accent (interaction only: links, primary button, focus ring, selected state, forecast line)**

| Token | Hex | Verified contrast |
|---|---|---|
| `--accent` | `#174A94` | 8.59:1 on surface, 7.36:1 on bg |
| `--accent-hover` | `#123C78` | 10.81:1 on surface |
| `--on-accent` | `#FFFFFF` | 8.59:1 on accent |
| `--accent-soft` | `#E3EBF6` | Selected row / chip background. Ink on it 14.45:1, accent on it 7.15:1, warn-text on it 5.99:1 |
| `--focus` | `#174A94` | 8.59:1 on surface (ring is 2 px solid, offset 2 px); always equals `--accent` |

**Status (reserved; never used for anything but market status and the alert form)**

| Token | Hex | Use | Verified contrast |
|---|---|---|---|
| `--ok-text` | `#1E6B3A` | Badge text | 5.59:1 on ok-bg, 6.52:1 on surface |
| `--ok-bg` | `#E3F1E7` | Badge background | — |
| `--ok-mark` | `#2E8B57` | Dot, map fill, sparkline tint | 4.25:1 on surface |
| `--warn-text` | `#7A4E00` | Badge text, "differs from source" marker | 6.30:1 on warn-bg, 7.20:1 on surface, 5.99:1 on accent-soft |
| `--warn-bg` | `#FBEFD2` | Badge background | — |
| `--warn-mark` | `#9E6A00` | Dot, map fill (darker so it holds 3:1 on the new page) | see `docs/accessibility.md` |
| `--bad-text` | `#A32D2D` | Badge text | 5.68:1 on bad-bg, 7.07:1 on surface |
| `--bad-bg` | `#F9E1E1` | Badge background | — |
| `--bad-mark` | `#C2362B` | Dot, map fill, anomaly marker, notice edge and rule, danger button | 5.45:1 on surface, 4.38:1 vs bad-bg |
| `--on-bad` | `#FFFFFF` | Danger button text | 5.45:1 on bad-mark |
| `--bad-hover` | `#A32D2D` | Danger button hover | 7.07:1 with white |

**AI surface (assistant only)**

| Token | Hex | Use | Verified contrast |
|---|---|---|---|
| `--ai-bg` | `#EEEAF9` | Assistant answer card background | ink on it 14.69:1 |
| `--ai-border` | `#8F7FD0` | 1 px border of the answer card | 2.91:1 vs ai-bg |
| `--ai-label` | `#43318F` | "Assistant" eyebrow, sparkle icon | 8.57:1 on ai-bg |

**Data series (semantic, for the time series)**

| Token | Hex | Use | Verified contrast |
|---|---|---|---|
| `--series-actual` | `#1C1A17` | Actual, 2 px solid | 17.36:1 |
| `--series-forecast` | `#2F5F9E` | Forecast, 2 px dashed `6 4` | 6.46:1 |
| `--series-prior` | `#7D786E` | Prior year, 1.5 px dotted `2 3` | 4.39:1 |

**Categorical (radar, scatter; fixed order, never cycled; validated with the dataviz validator, all checks pass, first three slots also pass all-pairs)**

`--cat-1 #2F5F9E` · `--cat-2 #C2622E` · `--cat-3 #1F8F7A` · `--cat-4 #B8860B` · `--cat-5 #A0527E` · `--cat-6 #4E8A2F`

**Sequential (choropleth by revenue or share; one hue, light to dark, luminance verified monotonic)**

`--seq-1 #E6ECF5` · `--seq-2 #C3D2E8` · `--seq-3 #9AB4D8` · `--seq-4 #6E92C3` · `--seq-5 #4A72A9` · `--seq-6 #2F5F9E` · `--seq-7 #1F4E8C`

**Diverging (heat map and choropleth by attainment or growth; warm below baseline, cool above, neutral middle; luminance verified monotonic on each arm)**

`--div-n3 #B5552C` · `--div-n2 #D08A6B` · `--div-n1 #E9C4B2` · `--div-0 #D9D4C9` · `--div-p1 #B7C7DE` · `--div-p2 #7F9FC9` · `--div-p3 #2F5F9E`

**Elevation and headline colours (direction A)**

Three layers carry depth, and every surface keeps its 1 px border so a shadow is never the only edge: card (`--shadow-card`: KPI tiles, sections, the grid, the AI surface), raised (`--shadow-raised`, `--surface-raised`: the assistant panel), overlay (`--shadow-overlay`, `--surface-overlay`: dialog, palette, menus, tooltips, sheets). `--shadow-header`, `--shadow-toolbar` and `--shadow-basin` serve the header, the Analyst toolbar and the map. Dark adds a one pixel top highlight (`--hairline`). `--ok-display`, `--warn-display` and `--bad-display` colour the Overview headline's status words (large text, 3:1) on their `-bg` wash and nowhere else.

### 3.2 Dark theme

**Neutrals**

| Token | Hex | Verified contrast |
|---|---|---|
| `--bg` | `#0F1318` | — |
| `--surface` | `#171C23` | — |
| `--surface-2` | `#1F2630` | decorative |
| `--border` | `#303A46` | hairline, decorative |
| `--grid` | `#242C36` | decorative |
| `--ink` | `#E6EAF0` | see `docs/accessibility.md` |
| `--ink-2` | `#AEB6C2` | see `docs/accessibility.md` |
| `--ink-muted` | `#8F98A6` | see `docs/accessibility.md` |
| `--ink-disabled` | `#6B7482` | disabled only |

**Accent**

| Token | Hex | Verified contrast |
|---|---|---|
| `--accent` | `#8DB4E8` | see `docs/accessibility.md` |
| `--accent-hover` | `#A7C5EE` | — (lighter, higher) |
| `--on-accent` | `#0F1318` | see `docs/accessibility.md` |
| `--accent-soft` | `#1D2A3C` | see `docs/accessibility.md` |
| `--focus` | `#8DB4E8` | see `docs/accessibility.md` |

**Status**

| Token | Hex | Verified contrast |
|---|---|---|
| `--ok-text` | `#8FD9A8` | see `docs/accessibility.md` |
| `--ok-bg` | `#15291F` | — |
| `--ok-mark` | `#5FBF84` | 7.35:1 on surface |
| `--warn-text` | `#F0C978` | 8.43:1 on warn-bg, 10.56:1 on surface |
| `--warn-bg` | `#2F2A14` | — |
| `--warn-mark` | `#E0A93A` | 7.85:1 on surface |
| `--bad-text` | `#F3A1A1` | 7.41:1 on bad-bg, 8.26:1 on surface |
| `--bad-bg` | `#35201F` | — |
| `--bad-mark` | `#E36B5F` | 5.18:1 on surface, 4.64:1 vs bad-bg |
| `--on-bad` | `#0F1318` | see `docs/accessibility.md` |
| `--bad-hover` | `#F08A80` | see `docs/accessibility.md` |

**AI surface**

| Token | Hex | Verified contrast |
|---|---|---|
| `--ai-bg` | `#1F2133` | see `docs/accessibility.md` |
| `--ai-border` | `#7A68E0` | 3:1 vs ai-bg, asserted |
| `--ai-label` | `#C3B6F5` | 8.19:1 on ai-bg |

**Data series**

`--series-actual #E6EAF0` · `--series-forecast #6291D4` · `--series-prior #8F98A6` (ratios in `docs/accessibility.md`)

**Categorical (validated for the dark surface, all checks pass, first three pass all-pairs)**

`--cat-1 #6291D4` · `--cat-2 #D4753F` · `--cat-3 #279A80` · `--cat-4 #B08A22` · `--cat-5 #C26A98` · `--cat-6 #63A040`

**Sequential (dark: light end is the low value so the map reads the same way)**

`--seq-1 #2A3444` · `--seq-2 #334A68` · `--seq-3 #3F6190` · `--seq-4 #5079B3` · `--seq-5 #6291D4` · `--seq-6 #86ACE4` · `--seq-7 #AFC9EE`

**Diverging**

`--div-n3 #E0875C` · `--div-n2 #B86A45` · `--div-n1 #7A4C35` · `--div-0 #3A3730` · `--div-p1 #3B5476` · `--div-p2 #5079B3` · `--div-p3 #86ACE4`

### 3.3 Shadows

Light: cards have no shadow. Only popovers and the tooltip: `0 1px 2px rgba(28,26,23,0.06), 0 4px 12px rgba(28,26,23,0.08)`.
Dark: no shadows at all. Elevation is surface stepping (`--bg` < `--surface` < `--surface-2`).

## 4. Spacing, density, radius, borders

Two density scales, switched by `html[data-density="executive"]` (default) and `html[data-density="analyst"]`. Components read only the density tokens; they never hard-code a pixel value from this table.

| Token | Overview | Analyst |
|---|---|---|
| `--space-unit` | 8 px | 4 px |
| `--gap` (between widgets) | 16 px | 8 px |
| `--pad-card` | 20 px | 12 px |
| `--pad-cell-y` | 12 px | 2 px (rows are held to `--row-h` by `height`; cell padding only keeps a 24 px sparkline or a 28 px button inside 32) |
| `--pad-cell-x` | 16 px | 12 px |
| `--row-h` (table and list rows) | 44 px | 32 px |
| `--control-h` (buttons, inputs, select) | 36 px | 28 px |
| `--chip-h` | 24 px | 22 px |
| `--text-body` resolved | 14 / 20 | 13 / 18 |
| `--text-kpi` resolved | 28 / 32 | 22 / 26 |
| Widgets per row in the grid section | 2 | 3 |

Fixed in both densities:

- `--radius-control: 6px` (buttons, inputs, chips that are rectangular), `--radius-card: 8px`, `--radius-pill: 999px` (badges, citation chips, segmented control).
- Borders are always `1px solid var(--border)`. No 2 px borders except the focus ring.
- Page max width 1280 px, centered, 24 px side gutter at ≥ 1024 px, 16 px below. The layout must work at 390 px wide with no horizontal scroll: widgets stack to one column, wide tables and the heat map scroll inside their own labelled region with a sticky first column, and under 1024 px the assistant is a fixed bottom bar (56 px, with the palette button) that opens a 90 dvh bottom sheet. Under 768 px the header is two 44 px rows. On a touch screen (`pointer: coarse`) every control is at least 44 × 44 px and chips 36 px tall (`--control-h` 44, `--chip-h` 36, `--row-h` 44).
- Content column split at ≥ 1024 px: dashboard `minmax(0, 1fr)`, assistant panel fixed 380 px, gap `--gap`.

## 4.1 Composition

Seven rules so that every new card looks like its siblings. Rules 2, 3 and 4 are enforced in code: one `Eyebrow` and one `CardHeader` component, and `tests/unit/composition.test.ts` fails if figures are formatted without the `num` class or an eyebrow style is copied.

1. **One display element per screen.** The verdict sentence on Overview (`--text-display`), the 20 px section eyebrow row on Analyst. A second display size competes with it and the eye has nowhere to start. Everything else is 22 px titles or smaller.
2. **Eyebrows never wrap.** 11 px, 0.06 em, 600, uppercase, `white-space: nowrap`. If it does not fit, shorten the words (`NEEDS ATTENTION`, not `MARKETS NEEDING ATTENTION`), never the size. One `Eyebrow` component.
3. **One header grammar for every card.** Serif title, muted subtitle on the next line, provenance caption and actions right-aligned on the title row, same height on every card. One `CardHeader` component; no card builds its own header.
4. **Every number is tabular.** `font-variant-numeric: tabular-nums lining-nums` on tiles, tables, tooltips, chips and bars (`.num`), so columns align on the decimal and scanning down is comparing. KPI headlines and the verdict are serif 600 tabular; everything else is sans.
5. **Captions right-align to the card edge.** On the Analyst sheet the title row holds the eyebrow, the subtitle and the `View as table` toggle (top-aligned with the eyebrow; the subtitle may wrap without moving it). `Source · data.json` and `Derived · …` sit bottom-right of the card body, 8 px under the chart or table, 11/14 px `--ink-muted`, never in the title row and never floating mid-card. Two kinds of legend, each in one fixed place at every width. A series legend (what a line or polygon means: time series, radar) is its own row directly under the card's title and subtitle, never in the title row. A scale legend (the colour bins that key values: heat map, map) sits centred under the chart it keys, inside the card.
6. **Vertical rhythm on an 8 px grid.** 24 px between sections on Overview, 16 px on Analyst (`--gap-section`); inside a section multiples of 4; density is a token, never an ad hoc margin.
7. **Empty states: one sentence, one action.** `No alert rules yet.` + `Add a rule`. No illustration, no second paragraph.

Analyst adds the ledger chrome (slice 14): sections are not cards but one sheet with 1 px rules between sections, eyebrow section titles, 32 px rows and 13 px body.

## 5. Motion

```css
--dur-fast: 150ms;   /* hover, focus, chip, badge */
--dur-base: 200ms;   /* panel open, mode switch, table toggle */
--dur-chart: 240ms;  /* line and marker transitions */
--ease: cubic-bezier(0.2, 0, 0, 1);
```

- Nothing flashes, pulses, bounces or loops, with two exceptions: the streaming caret (section 6.5) and the skeleton shimmer (section 6.7).
- `@media (prefers-reduced-motion: reduce)` and the page's reduced-motion checkbox both set every `--dur-*` to `0ms` and stop the caret and shimmer (caret becomes static, shimmer becomes flat `--surface-2`).
- Recipes: `.lift` (hover raises a card 1 px and swaps in `--shadow-raised`), `.press` (active scales to 0.98 over `--dur-press`), both flat under reduced motion. Overlays (dialog, palette, bottom sheet) enter with a spring and exit over `--dur-base`; menus, selects and tooltips fade and rise 4 px over `--dur-fast`. The shimmer animates a transform, not a background position. The assistant panel slides 16 px and fades in; the page columns switch at once. The chart tooltip and the saved badge fade in.
- Reduced motion keeps a plain opacity cross-fade for overlays (200 ms; 150 ms for menus, selects and tooltips) and no transform, since opacity is not movement.
- Hover never reveals anything that is not also reachable by keyboard. Hover only changes background or underline.

## 6. Components

Every component gets a visible heading in the preview and a story in Storybook if stories are built (eyebrow caption with its name, e.g. "KPI tile") so the reviewer can find it. Build them in this order on the page.

### 6.1 Header (app chrome)

Full-width bar, background `--surface`, bottom border, height 56 px in both modes, pinned to the top of the page in both modes, content centred to the 1280 px column.

The header is one fixed row from 1024 px up and never changes height with the drill. The wordmark and the controls on the right never shrink or wrap; the breadcrumb takes the remaining width and truncates with an ellipsis, each crumb exposing its full name as a `title`.

Left to right:
1. Wordmark: "Market Ops" in `--font-display` 18 px 600, colour `--ink`. Then a 1 px vertical rule 20 px tall in `--border`, 16 px margins.
2. Breadcrumbs: `Portfolio › Europe › Germany`. Each crumb is a link in `--text-label` weight 500 colour `--ink-2`, underline on hover and focus; the current crumb (Germany) is `--ink` weight 600 and not a link. Separator is the `›` character in `--ink-muted` with 8 px margins. Wrap in `<nav aria-label="Drill path">` with an `<ol>`; current crumb has `aria-current="page"`.
3. There is no period chip. The period and the product live in the page toolbar (6.1a), so the period is stated once. Under 768 px, where the toolbar steps aside for Executive, the header's second row carries the two selects.
4. Spacer (`flex: 1`).
5. Data stamp: caption text `DATA THROUGH MAY 2026` in `--ink-muted`, with a 6 px `--ok-mark` dot before it (decorative, `aria-hidden`). Wrap: `<span>` with `title="Source: data.json, latest period 2026-05"`.
6. Mode switch: segmented control with two options `Overview` | `Analyst`. Height `--control-h`, radius pill, background `--surface-2`, 2 px inner padding. Selected segment: background `--surface`, text `--ink` 600, border `--border`. Unselected: text `--ink-2`. Implement as `<div role="radiogroup" aria-label="View mode">` with two `<button role="radio" aria-checked>`; arrow keys move selection. This control is wired to `html[data-density]` in the preview.
7. Theme toggle: an icon button 36 × 36 (28 in Analyst), `aria-label="Switch to dark theme"` / `"Switch to light theme"`. Icons: lucide `sun` and `moon`, 18 px, stroke 1.75, `currentColor` = `--ink-2`. (Copy the SVG paths from lucide.dev; do not draw your own.)

Focus ring on every interactive element: `outline: 2px solid var(--focus); outline-offset: 2px;` via `:focus-visible`.

### 6.1a Page toolbar

One component (`PageToolbar`) for both modes, sticky under the header at `top: var(--header-h)`. It carries Period and Product always; Product is disabled with the tooltip "Select a market first" until a market is chosen. Analyst adds Basis, Status rule, the phone live toggle and the All facts button through the `extra`, `trailing` and `end` slots. Background `--bg`, bottom border `--border`, `--shadow-toolbar`, no top border (the header's border is the only edge between them). Role `toolbar`, named "Executive controls" or "Analyst controls".

### 6.2 KPI tile (Overview mode content)

Four tiles in a row (2 × 2 below 768 px). Card: `--surface`, border, `--radius-card`, padding `--pad-card`.

Anatomy, top to bottom, 4 px gaps:
1. Eyebrow: caption text in `--ink-muted` (the KPI name).
2. Headline: `--text-kpi`, colour `--ink`, never coloured by direction.
3. Delta row: `--text-label`. A direction icon (lucide `arrow-up-right` / `arrow-down-right` / `minus`, 14 px) then the delta value then the comparison label in `--ink-muted`. Delta colour: positive `--ok-text`, negative `--bad-text`, flat `--ink-2`. The icon is never the only signal; the sign character (+ or −, use the real minus U+2212) is always present.
4. Provenance sits in the info button's tooltip on the Executive tile. The Analyst strip says it once, below the row, right-aligned in caption size and `--ink-muted`: `Derived · sum of series · Source data.json` (or one source when all four share it). Tiles carry no caption of their own.

One tile component serves both modes: Executive draws each tile as a card; Analyst draws the same content as four cells of one ruled strip, with the info icons and the revenue sparkline. The fourth tile is `NEEDS ATTENTION` above market level and `STATUS` at market and product level: the shared status badge (md) with a one-line caption that truncates with an ellipsis (full text in `title`).

Tiles to show, in this order, with the exact numbers in section 9.1.

### 6.3 Status badge

One component (`StatusBadge`) everywhere a status appears: pill, glyph that differs by shape (dot, triangle, diamond) then the text. Tinted background and `--*-text` only for at risk and off track; on track is plain `--ink` text. Sizes: `md` (height `--chip-h`) in tiles, the attention list and tooltips, `sm` (20 px, 11 px text) in table and list rows. Text labels are exactly: `On track`, `At risk`, `Off track`. The text is the non-colour signal. In forced colours the pill keeps a 1 px `CanvasText` border.

Show the three badges side by side with a caption under each stating the token names used.

### 6.4 Analyst grid (table)

Card with title row: title `Markets · Europe` in `--text-title`; right-aligned ghost button `View as table` is **not** here (this is already a table). Instead the right side carries the caption `5 markets · May 2026 · Source · data.json`.

`<table>` with `<caption class="sr-only">`. Columns and alignment:

| Column | Align | Content |
|---|---|---|
| Market | left | Name in `--ink` weight 500, iso2 under it in caption `--ink-muted` only in Analyst density (hidden in Overview) |
| Status | left | Status badge (6.3) |
| Revenue | right | `$1.68M` style, see formatting rules 9.5 |
| Attainment | right | `92.0%`. Cell text stays `--ink` whatever the value; status colour is carried by the Status column only. |
| Growth YoY | right | `−9.7%` with sign; colour `--ok-text` / `--bad-text` by sign (sign is the non-colour signal) |
| Share | right | `8.9%` |
| Trend | left | 24-point sparkline, 96 × 24 px inline SVG, stroke 1.5 px `--ink-2`, no fill, last point an 3 px dot in `--ink`; anomaly month for Germany gets a 4 px ring in `--bad-mark`. `role="img"` with `aria-label="24-month revenue trend, latest 1.68M"` |
| | right | Row action: ghost icon button lucide `message-square-text` 16 px, `aria-label="Ask why Germany is off track"`. This is the "Ask why" affordance; in the preview it only focuses the assistant input and pre-fills the question text (section 9.4). |

Header row: background `--surface-2`, caption text `--ink-muted`, sticky at the card top. Rows: height `--row-h`, bottom border `--border`. Hover: background `--surface-2`. Selected row (Germany): background `--accent-soft` and a 3 px left inset rule in `--accent` (`box-shadow: inset 3px 0 0 var(--accent)`). Rows are focusable (`tabindex="0"`) and the selected one has `aria-selected="true"`.

Five rows, data in section 9.2.

### 6.5 Assistant panel and answer card

Panel: `--surface`, border, radius card. Header row: eyebrow `ASSISTANT` in `--ai-label` with lucide `sparkles` 14 px before it, then on the right a caption `Answers are AI-generated. Numbers link to source.` in `--ink-muted`.

Inside, the states below stacked with 16 px gaps, each with its own eyebrow label so the reviewer can tell them apart. All answer cards share this anatomy:

- Card: background `--ai-bg`, `1px solid var(--ai-border)`, radius card, padding `--pad-card`. No left accent rule; the full border plus the tinted background is the AI signal.
- Question echo above the card: `--text-label` `--ink-2`, prefixed with `You asked:` in `--ink-muted`.
- Answer text in `--text-answer` (serif), colour `--ink`.
- Numbers inside the answer text that correspond to a citation are wrapped in `<a class="cite-inline">` rendered as `--accent` with a 1 px dotted underline, `text-decoration-thickness: 1px; text-underline-offset: 3px`. Hover and focus make the underline solid. (In the sample texts the words to wrap are given in 9.4.)
- Citation row under the text, 8 px top margin, chips wrap with 6 px gaps. Chip: pill, height `--chip-h`, padding 0 10px, background `--accent-soft`, text `--accent` `--text-label`, lucide `link-2` 12 px before the label. Chips are `<button>` elements with `aria-label="Go to Germany, March 2026"`. Focus ring as everywhere.
- "Differs from source" variant of a chip: after the label, lucide `triangle-alert` 12 px in `--warn-text`, and the chip gets `aria-describedby` pointing to a visually hidden sentence `Assistant says at risk; source data says off track`. On hover and focus a tooltip (section 6.8) shows the two values in a 2-row table: `Assistant: At risk` / `Source (data.json): Off track`.
- Footer row, 12 px top margin, flex, space-between:
  - Left: confidence meter (6.6).
  - Right: `Show sources` disclosure button, ghost style, lucide `chevron-down` 14 px rotating 180° when open (`aria-expanded`). Opens a sources table (6.9) inside the card.

States to build (texts and chips in 9.4):

1. **Normal, high confidence** (Germany dip). 3 chips. Sources closed.
2. **Normal, high confidence, with a "differs from source" chip** (At-risk markets). 4 chips; the Germany chip carries the warning. Sources **open** so the reviewer sees the table.
3. **Low confidence** (Forecast miss). 3 chips, meter at Low.
4. **Abstain** (Next year). No chips. Instead of the confidence meter the footer left shows a pill `Can't answer from this data` with lucide `circle-slash` 12 px, background `--surface-2`, text `--ink-2`. Under the answer text a secondary line in `--text-label` `--ink-2`: `Data covers Jun 2024 to May 2026.` and a ghost button `Try: "Which markets are at risk?"` that pre-fills the input.
5. **Streaming**: the at-risk answer cut after the words "Germany is running well below forecast" followed by a caret: a 2 px × 1em bar in `--ai-label`, `animation: blink 1s steps(2) infinite`. The card header is the status slot: 24 px (`--chip-h`) high in every state, so the text below never moves when the state changes. Streaming shows caption `STREAMING…` in `--ink-muted` beside the AI label and, on the right, a `Stop` button (ghost, `sm` size, lucide `square` 12 px). When the answer stops, the right side gains the caption `Partial · no sources` beside the button, which becomes `Retry`; when it is done the confidence meter takes the right side. The footer is only for sources. No chips, no meter while streaming.
6. **Partial (stopped)**: the same cut text, no caret, followed by an inline pill `Stopped · partial answer` (background `--surface-2`, text `--ink-2`, lucide `circle-pause` 12 px). No chips, no meter. The header slot (state 5) shows the caption `Partial · no sources` (`--text-caption`, `--ink-muted`, sentence case, no icon) on the right beside the ghost button `Retry`. Where the citation chips would be, one caption line in the same style reads `Stopped before sources arrived. Retry to get citations.` The visible text is the screen-reader text, and the live region announces "Answer stopped, no sources". An answer that fails after text has streamed gets the same header caption and the footer line `Request failed before sources arrived. Retry to get citations.`; its Retry stays in the Request failed notice, and the live region announces "Request failed, no sources".
7. **Error**: the Notice component (6.12) with title `Request failed`, body `The assistant could not answer. Nothing was changed.` and a secondary `Retry`. Keep the question echo above it. No chips, no meter.

Input row at the bottom of the panel: `<textarea rows="1">` with placeholder `Ask about markets, products or periods…` in `--ink-muted`, height `--control-h`, border, radius control, full width, with a primary icon button `Send` (lucide `arrow-up`, `--accent` background, `--on-accent` icon) to the right. Under it three suggestion chips (same chip style as citations but background `--surface-2`, text `--ink-2`): `Which markets are at risk?`, `Why did Germany dip?`, `Compare APAC and Europe`.

### 6.6 Confidence meter

Inline flex, 8 px gap: three bars 14 × 6 px, radius 2 px, 3 px apart; then the word; then a one-line meaning in `--ink-muted` `--text-label`. Filled bars use `--ink-2`; empty bars use `--border`. Never a status colour.

| Level | Bars | Word | Meaning text | Icon (lucide, 14 px, before bars, `--ink-2`) |
|---|---|---|---|---|
| High | 3 filled | `High confidence` | `Directly supported by cited data` | `shield-check` |
| Medium | 2 filled | `Medium confidence` | `Supported, with gaps in the data` | `shield` |
| Low | 1 filled | `Low confidence` | `Directional only, verify before acting` | `shield-alert` |

Markup: `<div role="img" aria-label="High confidence: directly supported by cited data">`. The word and meaning are visible text; the bars are `aria-hidden`.

### 6.7 Loading skeleton

One KPI tile and one answer card in skeleton state, side by side. Skeleton blocks: `--surface-2`, radius 4 px, heights matching the text lines they stand in for (eyebrow 11 px, headline 28 px, delta 12 px). Shimmer: a linear gradient from `--surface-2` through `rgba(255,255,255,0.35)` (light) / `rgba(255,255,255,0.06)` (dark) moving left to right over 1.4 s, `infinite`. `aria-busy="true"` on the container and `<span class="sr-only">Loading</span>`. No fake numbers anywhere in a skeleton.

### 6.8 Tooltip

Used by the chart and the differs-from-source chip. Box: `--surface`, border, radius control, padding 8 px 10 px, shadow (light only), `--text-label`. Title line in `--ink` 600, rows in `--ink-2` with the value right-aligned in `--ink`, tabular. Appears on hover and on focus; dismissed with Escape. Positioned above the target, 8 px gap, with a 6 px caret.

### 6.9 Sources table (inside an answer card)

`<table>` with columns `Claim`, `Entity`, `Period`, `Source value`, `Assistant`. Caption text headers, rows in `--text-body-dense`. Period cells in `--font-mono`. Row background `--surface` (so it reads as source data inside the AI card: this contrast between the white table and the lilac card is intentional and must be kept). Where the assistant and source disagree, the `Assistant` cell text is `--warn-text` and the row gets the `triangle-alert` icon before the claim.

### 6.10 Time series chart with "View as table"

Card, title `Germany · Revenue vs forecast vs prior year`, caption to the right `Jun 2024 – May 2026 · USD · Source · data.json`. The legend is its own row under the title and subtitle; `View as table` stays in the title row on the right.

- Legend items: 16 × 2 px line sample in the series style (solid / dashed / dotted; 16 px so a dash pattern reads), a 6 px gap, then the name in `--text-label` `--ink-2`: `Actual`, `Forecast`, `Prior year`. Static, not interactive.
- `View as table` is a ghost button with lucide `table` 14 px, `aria-pressed`, `aria-controls` the table id. Pressing it hides the SVG (`hidden` attribute) and shows the table, and swaps the label to `View as chart`. Keyboard reachable, one click.

SVG: `viewBox 0 0 720 260`, width 100 %, `role="img"`, `aria-labelledby` the title and a `<desc>` that reads: `Line chart of Germany monthly revenue from June 2024 to May 2026. Actual tracks below forecast throughout, with a sharp dip to 1.21 million in March 2026, 27 percent below February. Table available via View as table.`

- Margins: left 48, right 16, top 16, bottom 32.
- Y axis: 0 to 2.5M, ticks at 0.5M steps, labels `$0`, `$0.5M`, … `$2.5M` in caption style `--ink-muted` right-aligned at x = 40. Grid lines `--grid` 1 px, no axis line.
- X axis: 24 months, labels at Jun 24, Dec 24, Jun 25, Dec 25, May 26 in caption style.
- Lines: Actual `--series-actual` 2 px, `stroke-linejoin: round`; Forecast `--series-forecast` 2 px, `stroke-dasharray: 6 4`; Prior year `--series-prior` 1.5 px, `stroke-dasharray: 2 3`. No area fills, no markers except:
- Anomaly marker at Mar 2026 on the Actual line: 8 px circle, fill `--bad-mark`, 2 px stroke `--surface`. A label above-right in `--text-label` `--bad-text`: `−27% vs Feb`, with a 1 px leader line in `--bad-mark`. The marker is a `<g tabindex="0" role="button" aria-label="Anomaly: March 2026 revenue fell 27 percent versus February">` and shows the tooltip on focus.
- Hover layer: an invisible full-height rect; on mouse move a 1 px vertical crosshair in `--border` snaps to the nearest month and the tooltip (6.8) shows title `Mar 2026` and rows `Actual $1.21M`, `Forecast $1.31M`, `Prior year $1.76M`, `Attainment 92.2%`. Keyboard: left and right arrows move the crosshair when the chart is focused.

Table (hidden by default): the 24 rows in section 9.3, `<caption>` same as the chart title, right-aligned numeric columns, `--text-body-dense`, the Mar 2026 row carrying the `triangle-alert` icon and `aria-label` text `Anomaly`.

### 6.11 Buttons

| Style | Background | Text | Border | Hover |
|---|---|---|---|---|
| Primary | `--accent` | `--on-accent` | none | `--accent-hover` |
| Secondary | `--surface` | `--ink` | `--border` | background `--surface-2` |
| Ghost | transparent | `--ink-2` | none | background `--surface-2`, text `--ink` |
| Danger (destructive confirms only, e.g. delete an alert) | `--bad-mark` | `--on-bad` | none | `--bad-hover` |

Height `--control-h`, padding 0 12px, radius control, `--text-label` weight 500, 6 px icon gap. Disabled: text `--ink-disabled`, background `--surface-2`, no hover.

### 6.12 Notice (error and rollback)

One component for the stream error, the failed-save rollback, and any blocking error. Anatomy: background `--bad-bg`, `1px solid var(--bad-mark)`, left rule `box-shadow: inset 4px 0 0 var(--bad-mark)`, radius card, padding `--pad-card`; lucide `circle-alert` 20 px in `--bad-text` top-aligned with the title; title `--text-body` weight 600 in `--bad-text`; body `--text-body` in `--ink`; actions: one secondary button, optionally one ghost `Dismiss`. `role="alert"`. Entry is the base 200 ms fade only. Verified: title on fill 5.68:1 light / 7.41:1 dark; body on fill 13.96:1 / 12.21:1; rule vs fill 4.38:1 / 4.64:1; edge vs surface 5.45:1 / 5.18:1.

### 6.13 Form field, valid and invalid

Label `--text-label` weight 500 `--ink` above the input, 4 px gap. Input: height `--control-h`, border, radius control, `--text-body`, padding 0 10px, background `--surface`; unit suffix (`%`) in `--ink-muted` inside the input's right edge. Help text under the input in `--text-label` `--ink-muted`.
Invalid: input border `1px solid var(--bad-mark)`; message line below, 4 px gap: lucide `circle-alert` 14 px plus text in `--bad-text` weight 500 `--text-label`; `aria-invalid="true"`, `aria-describedby` pointing at the message. Focus ring stays `--focus`, never red. The submit button stays primary.

Alert form specimen (confirmed): card title `Alert thresholds`; fields `Growth below` (suffix `%`, help `Alert when year-on-year growth falls below this value`), `Attainment below` (suffix `%`, help `Alert when forecast attainment falls below this value`), `Scope` select with `All markets` selected; primary `Save thresholds`. Invalid example: Attainment below `120` with message `Enter a value between 0 and 100.` Rollback example: Notice with title `Couldn't save`, body `Your thresholds were restored to the last saved values (growth below 0%, attainment below 95%).`, secondary `Try again`, ghost `Dismiss`; the inputs show `0` and `95`.

Save states shown inline next to the button, `--text-label`: `Saving…` (`--ink-muted`), `Saved · just now` (`--ok-text` with lucide `check` 14 px), `Failed` (handled by the Notice). Never a silent optimistic flip.

### 6.14 Sources table rows

Rows for assistant states 1, 2 and 3 are in preview-spec.md section 9.4 and preview-spec-addendum-sources.md. Rule for the app: one row per citation, `Source value` always from data.json (`kpis` for status and attainment, `series` sums for monthly figures), `Assistant` column is the assistant's wording; a disagreement gets the warning icon and `--warn-text`.

### 9.5 Formatting rules

- Currency: USD, `$` prefix, two significant decimals with `M` for millions (`$22.85M`, `$0.94M`) in tiles, grid and tooltips; full integers with thousands separators in tables (`1,676,586`).
- Percentages: one decimal, always with sign for deltas and growth (`+7.3%`, `−9.7%`), no sign for levels (`92.0%`). Use the real minus sign U+2212, never a hyphen.
- Periods: `May 2026` in prose and labels; `2026-05` only in mono cells and tooltips.
- Month names: short (`Jun 2024`) in compact text such as chips, pills, coverage lines and table cells; full (`June 2024`) in pickers and captions. Helpers: `formatPeriodAbbr` for short, `formatPeriod` for full.
- Counts: `6 of 13`.


## 10. Accessibility checklist (every build thread verifies before handing off)

1. Every interactive element is reachable with Tab and operable with Enter or Space; the segmented controls with arrow keys; the chart crosshair with arrow keys when focused.
2. Visible focus ring on every interactive element in both themes.
3. No information is colour-only: status has text, deltas have signs, confidence has a word, the differs marker has an icon and hidden text, series have dash patterns and a legend.
4. Every chart and sparkline has `role="img"` with a meaningful label, and the chart has a table alternative one click away.
5. All text tokens meet 4.5:1 on their surfaces in both themes; the runtime token sheet shows it.
6. Reduced motion stops the caret and shimmer and zeroes transitions.
7. The page has one `<h1>` ("Ledger preview"), sections use `<h2>`, components `<h3>`.
8. Run axe (Playwright `@axe-core/playwright` if available, else the axe browser extension output pasted) and fix every violation. Report the result.
9. No horizontal scroll at 390 px, 768 px, 1024 px and 1440 px.
10. Google Fonts failing to load must not break layout (system fallbacks defined).

