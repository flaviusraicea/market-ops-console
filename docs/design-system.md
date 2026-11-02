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

- Focus ring always equals the accent: `--focus: #174A94` light, `#8FB4E6` dark.
- Inset wells and table header rows use `--surface-2 #E8E3D8` (1.28:1 vs white cards). `--ink-muted` darkened to `#66615A` so captions on wells stay at 4.92:1.
- `--bad-hover` and `--on-bad` are tokens. Dark `--on-bad` is `#161512`.
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
| `--bg` | `#F1EDE4` | Page background, warm paper | 1.17:1 vs surface |
| `--surface` | `#FFFFFF` | Cards, table, header | — |
| `--surface-2` | `#E8E3D8` | Inset wells, table header row, skeletons | 1.28:1 vs surface, 1.10:1 vs bg (decorative) |
| `--border` | `#BFB8A8` | All 1 px borders | 1.97:1 vs surface |
| `--grid` | `#E3DED3` | Chart grid lines only | 1.34:1 vs surface (decorative) |
| `--ink` | `#1C1A17` | Primary text, headline numbers, the "actual" line | 17.36:1 on surface, 14.9:1 on bg |
| `--ink-2` | `#5B574F` | Secondary text | 7.19:1 on surface, 6.15:1 on bg, 5.62:1 on surface-2 |
| `--ink-muted` | `#66615A` | Captions, provenance, axis labels, placeholders | 6.14:1 on surface, 5.25:1 on bg, 4.92:1 on surface-2 |
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
| `--warn-mark` | `#B57A00` | Dot, map fill | 3.09:1 on surface |
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

### 3.2 Dark theme

**Neutrals**

| Token | Hex | Verified contrast |
|---|---|---|
| `--bg` | `#161512` | — |
| `--surface` | `#201E1A` | — |
| `--surface-2` | `#2A2722` | 1.12:1 vs surface (decorative) |
| `--border` | `#413D35` | 1.50:1 vs surface |
| `--grid` | `#332F29` | decorative |
| `--ink` | `#ECE8E0` | 13.62:1 on surface, 14.94:1 on bg |
| `--ink-2` | `#B5AFA3` | 7.63:1 on surface |
| `--ink-muted` | `#9A9488` | 5.52:1 on surface |
| `--ink-disabled` | `#78726A` | disabled only |

**Accent**

| Token | Hex | Verified contrast |
|---|---|---|
| `--accent` | `#8FB4E6` | 7.80:1 on surface |
| `--accent-hover` | `#A9C6EE` | — (lighter, higher) |
| `--on-accent` | `#161512` | 8.55:1 on accent |
| `--accent-soft` | `#243040` | accent on it 6.26:1 |
| `--focus` | `#8FB4E6` | 7.80:1 |

**Status**

| Token | Hex | Verified contrast |
|---|---|---|
| `--ok-text` | `#8FD9A8` | 8.65:1 on ok-bg, 10.03:1 on surface |
| `--ok-bg` | `#1C2E22` | — |
| `--ok-mark` | `#5FBF84` | 7.35:1 on surface |
| `--warn-text` | `#F0C978` | 8.43:1 on warn-bg, 10.56:1 on surface |
| `--warn-bg` | `#3A2E14` | — |
| `--warn-mark` | `#E0A93A` | 7.85:1 on surface |
| `--bad-text` | `#F3A1A1` | 7.41:1 on bad-bg, 8.26:1 on surface |
| `--bad-bg` | `#3A2020` | — |
| `--bad-mark` | `#E36B5F` | 5.18:1 on surface, 4.64:1 vs bad-bg |
| `--on-bad` | `#161512` | 5.68:1 on bad-mark |
| `--bad-hover` | `#F08A80` | 7.52:1 with #161512 |

**AI surface**

| Token | Hex | Verified contrast |
|---|---|---|
| `--ai-bg` | `#272338` | ink on it 12.42:1 |
| `--ai-border` | `#6E5BD9` | 3.01:1 vs ai-bg |
| `--ai-label` | `#C3B6F5` | 8.19:1 on ai-bg |

**Data series**

`--series-actual #ECE8E0` (13.62:1) · `--series-forecast #6291D4` (5.17:1) · `--series-prior #9A9488` (5.52:1)

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

Two density scales, switched by `html[data-density="overview"]` (default) and `html[data-density="analyst"]`. Components read only the density tokens; they never hard-code a pixel value from this table.

| Token | Overview | Analyst |
|---|---|---|
| `--space-unit` | 8 px | 4 px |
| `--gap` (between widgets) | 16 px | 8 px |
| `--pad-card` | 20 px | 12 px |
| `--pad-cell-y` | 12 px | 7 px |
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
- Page max width 1280 px, centered, 24 px side gutter at ≥ 1024 px, 16 px below. The layout must work at 390 px wide with no horizontal scroll (widgets stack to one column, the assistant panel moves below the dashboard).
- Content column split at ≥ 1024 px: dashboard `minmax(0, 1fr)`, assistant panel fixed 380 px, gap `--gap`.

## 5. Motion

```css
--dur-fast: 150ms;   /* hover, focus, chip, badge */
--dur-base: 200ms;   /* panel open, mode switch, table toggle */
--dur-chart: 240ms;  /* line and marker transitions */
--ease: cubic-bezier(0.2, 0, 0, 1);
```

- Nothing flashes, pulses, bounces or loops, with two exceptions: the streaming caret (section 6.5) and the skeleton shimmer (section 6.7).
- `@media (prefers-reduced-motion: reduce)` and the page's reduced-motion checkbox both set every `--dur-*` to `0ms` and stop the caret and shimmer (caret becomes static, shimmer becomes flat `--surface-2`).
- Hover never reveals anything that is not also reachable by keyboard. Hover only changes background or underline.

## 6. Components

Every component gets a visible heading in the preview and a story in Storybook if stories are built (eyebrow caption with its name, e.g. "KPI tile") so the reviewer can find it. Build them in this order on the page.

### 6.1 Header (app chrome)

Full-width bar, background `--surface`, bottom border, height 56 px (Overview) / 48 px (Analyst), content centred to the 1280 px column.

The header is one fixed row from 1024 px up and never changes height with the drill. The wordmark and the controls on the right never shrink or wrap; the breadcrumb takes the remaining width and truncates with an ellipsis, each crumb exposing its full name as a `title`.

Left to right:
1. Wordmark: "Market Ops" in `--font-display` 18 px 600, colour `--ink`. Then a 1 px vertical rule 20 px tall in `--border`, 16 px margins.
2. Breadcrumbs: `Portfolio › Europe › Germany`. Each crumb is a link in `--text-label` weight 500 colour `--ink-2`, underline on hover and focus; the current crumb (Germany) is `--ink` weight 600 and not a link. Separator is the `›` character in `--ink-muted` with 8 px margins. Wrap in `<nav aria-label="Drill path">` with an `<ol>`; current crumb has `aria-current="page"`.
3. Active-context chip immediately after the crumbs: `Period: May 2026 ×`, shown only when the period is not the latest. There is no product chip; the Product select and the last crumb carry it. Chip style: height `--chip-h`, radius pill, background `--surface-2`, border `--border`, text `--text-label` `--ink-2`, the `×` is a 16 px button with `aria-label="Clear period"`. Keyboard focusable.
4. Spacer (`flex: 1`).
5. Data stamp: caption text `DATA THROUGH MAY 2026` in `--ink-muted`, with a 6 px `--ok-mark` dot before it (decorative, `aria-hidden`). Wrap: `<span>` with `title="Source: data.json, latest period 2026-05"`.
6. Mode switch: segmented control with two options `Overview` | `Analyst`. Height `--control-h`, radius pill, background `--surface-2`, 2 px inner padding. Selected segment: background `--surface`, text `--ink` 600, border `--border`. Unselected: text `--ink-2`. Implement as `<div role="radiogroup" aria-label="View mode">` with two `<button role="radio" aria-checked>`; arrow keys move selection. This control is wired to `html[data-density]` in the preview.
7. Theme toggle: an icon button 36 × 36 (28 in Analyst), `aria-label="Switch to dark theme"` / `"Switch to light theme"`. Icons: lucide `sun` and `moon`, 18 px, stroke 1.75, `currentColor` = `--ink-2`. (Copy the SVG paths from lucide.dev; do not draw your own.)

Focus ring on every interactive element: `outline: 2px solid var(--focus); outline-offset: 2px;` via `:focus-visible`.

### 6.2 KPI tile (Overview mode content)

Four tiles in a row (2 × 2 below 768 px). Card: `--surface`, border, `--radius-card`, padding `--pad-card`.

Anatomy, top to bottom, 4 px gaps:
1. Eyebrow: caption text in `--ink-muted` (the KPI name).
2. Headline: `--text-kpi`, colour `--ink`, never coloured by direction.
3. Delta row: `--text-label`. A direction icon (lucide `arrow-up-right` / `arrow-down-right` / `minus`, 14 px) then the delta value then the comparison label in `--ink-muted`. Delta colour: positive `--ok-text`, negative `--bad-text`, flat `--ink-2`. The icon is never the only signal; the sign character (+ or −, use the real minus U+2212) is always present.
4. Provenance line: caption in `--ink-muted`: `Source · data.json` or `Derived · sum of series` exactly as listed in section 9.

Tiles to show, in this order, with the exact numbers in section 9.1.

### 6.3 Status badge

Pill, height 22 px, padding 0 10px, `--text-label` weight 500, 6 px gap between dot and text. Dot is 8 px, `--*-mark`. Background `--*-bg`, text `--*-text`. Text labels are exactly: `On track`, `At risk`, `Off track`. The badge contains the dot and the text only, no icon. The text is the non-colour signal. Add `<span class="sr-only">Status: </span>` inside for screen readers.

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
5. **Streaming**: the at-risk answer cut after the words "Germany is running well below forecast" followed by a caret: a 2 px × 1em bar in `--ai-label`, `animation: blink 1s steps(2) infinite`. Footer shows, on the left, caption `STREAMING…` in `--ink-muted` and on the right a `Stop` button (secondary style, lucide `square` 12 px). No chips, no meter.
6. **Partial (stopped)**: the same cut text, no caret, followed by an inline pill `Stopped · partial answer` (background `--surface-2`, text `--ink-2`, lucide `circle-pause` 12 px). No chips, no meter. Footer left: caption `PARTIAL · NO SOURCES ATTACHED`. Footer right: ghost button `Retry`.
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

Card, title `Germany · Revenue vs forecast vs prior year`, caption to the right `Jun 2024 – May 2026 · USD · Source · data.json`. Below the title: a toolbar with a legend on the left and `View as table` on the right.

- Legend items: 16 × 2 px line sample in the series style (solid / dashed / dotted) then the name in `--text-label` `--ink-2`: `Actual`, `Forecast`, `Prior year`. Static, not interactive.
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

