# Accessibility notes

The console targets WCAG 2.1 AA. What is checked automatically, and where, is listed at the end; this page also holds the keyboard reference and the contrast table.

## Keyboard tour

### Tab order

Recorded from the production build at 1440 px, one Tab at a time from the skip link, and asserted by `tests/e2e/slice11.spec.ts`. The lists below are generated from `tests/e2e/tabOrder.ts` (`pnpm docs:a11y`); a label is the focused element's accessible name, or its text. Charts and the map are one tab stop each and move inside with the arrow keys. The assistant column follows the dashboard in the DOM, so on a keyboard it is reached last; `Ask why` moves focus into its composer.

<!-- tab-order:start -->
#### Overview (`/`)

1. Skip to content
2. Period
3. Overview
4. Switch to dark theme
5. About this verdict
6. Drill into North America · 2
7. United States, on track
8. Canada, on track
9. Drill into Europe · 5
10. Germany, off track
11. Spain, off track
12. Italy, at risk
13. United Kingdom, at risk
14. France, at risk
15. Drill into APAC · 4
16. Japan, on track
17. China, on track
18. India, on track
19. Australia, on track
20. Drill into LATAM · 2
21. Brazil, at risk
22. Mexico, on track
23. About portfolio revenue
24. About forecast attainment
25. About year-on-year growth
26. About markets needing attention
27. Germany
28. Ask why Germany dipped
29. Spain
30. Ask why Spain is off track
31. Italy
32. Ask why Italy is at risk
33. United Kingdom
34. Ask why United Kingdom is at risk
35. Brazil
36. Ask why Brazil is at risk
37. France
38. Ask why France is at risk
39. China
40. France
41. Canada
42. View as table of the markets map
43. Australia, on track, 101.8% attainment
44. Drill into North America
45. Drill into Europe
46. Drill into APAC
47. Drill into LATAM
48. Collapse assistant
49. Ask about markets, products or periods…
50. Send
51. Open command palette
52. Which markets are at risk?
53. Why did Germany dip?
54. Compare APAC and Europe

#### Analyst, Germany (`/?mode=analyst&region=eu&market=de`)

1. Skip to content
2. Portfolio
3. Europe
4. Analyst
5. Switch to dark theme
6. Period
7. Product
8. Month
9. Status rule
10. All facts
11. Products · Germany, scrollable
12. Product
13. Revenue
14. Forecast
15. Prior year
16. Attainment
17. Growth YoY
18. Units
19. Veltrix $0.57M $0.62M $0.64M 92.7% −10.1% 3,431
20. Nuvora $0.40M $0.44M $0.44M 91.1% −8.7% 1,120
21. Orbispan $0.32M $0.35M $0.35M 91.9% −9.3% 1,157
22. Calyx $0.23M $0.24M $0.26M 93.4% −10.9% 858
23. Zephyra $0.15M $0.16M $0.16M 92.6% −10.0% 1,052
24. Attainment
25. View as table of the markets map
26. Germany, off track, 92.0% attainment
27. Drill into North America
28. Drill into Europe
29. Drill into APAC
30. Drill into LATAM
31. View as table of the Germany revenue chart
32. Month
33. Anomaly: March 2026 revenue fell 27 percent versus February
34. View as table of the compare radar chart
35. France, Attainment: 96.4%
36. View as table of the attainment by month heat map
37. Germany, May 2026, 92.2% of forecast
38. Alerts0 rules · Growth below · Attainment below
39. Open assistant
40. Open command palette
<!-- tab-order:end -->

### Shortcuts

| Where | Keys | What it does |
| --- | --- | --- |
| Anywhere | `Ctrl+K` / `⌘K` | Opens the command palette; `Esc` closes it and returns focus to what opened it |
| Command palette | `↑` `↓`, `Enter` | Move through commands and run one. `Go to` and view commands close it; `Ask` leaves focus in the composer |
| Segmented controls (mode, basis, metric) | `←` `→` or `↑` `↓` | Move to and select the neighbouring option, wrapping at the ends |
| Map | `←` `→` `↑` `↓`, `Home`, `End`, `Enter` or `Space` | Move between markets and drill into the focused one |
| Time series | `←` `→`, `Home`, `End`, `Enter` or `Space` | Move the active month, and select it as the period |
| Time series anomaly marker | `Shift+Enter` | Asks the assistant about the anomaly |
| Heat map | Arrows, `Home` / `End` (row), `Ctrl+Home` / `Ctrl+End` (corners), `PageUp` / `PageDown` (columns), `Enter` | Move between cells and select one; `Shift+Enter` asks the assistant about the cell |
| Any chart tooltip | `Esc` | Hides it without moving focus |
| Assistant composer | `Enter`, `Shift+Enter` | Sends; adds a line break |
| Open assistant panel (from 1024 px) | `Esc` | Collapses it to the rail and returns focus to the rail toggle |
| Any scrolling region | `Tab` to focus, then arrows or `PageUp` / `PageDown` | Wide tables and the conversation are keyboard-scrollable regions |

### Focus rules

- **Skip link** is the first stop and moves focus to `#main`.
- **Drilling** (breadcrumb, map, status strip, palette) keeps the page and moves focus to the verdict heading `#verdict-h` when the navigation came from the palette, so the new context is read first.
- **Rail and panel** (slice 14): opening with the rail toggle moves focus to the panel heading; opening from an entry point (`Ask why`, a heat map cell, an anomaly marker, the palette) moves focus to the composer. Between 1024 and 1279 px the open panel overlays the dashboard with a scrim and Tab wraps inside it; from 1280 px it pushes the dashboard and does not trap.
- **Live region** for "Answer complete", "Answer stopped" and "Answer failed" stays mounted while the panel is collapsed, so the announcement is not lost.
- **Palette** (slice 18) is a modal dialog: focus starts in its input, is trapped inside, and returns to the opener on `Esc` or on a command that does not move focus elsewhere.


## Preferences and layout

- **Theme.** A pre-paint script sets `data-theme` from `localStorage`, falling back to `prefers-color-scheme`; a saved choice wins over the OS. Every colour is a CSS variable (including `--map-land`), so charts and chips re-colour on toggle with no JS lookup. Tested in `slice11.spec.ts`.
- **Reduced motion.** `prefers-reduced-motion: reduce` and the console's own `html[data-reduced-motion="true"]` (palette command) apply one blanket rule in `globals.css` that sets animation and transition durations to zero, so Radix and shadcn enter and exit animations stop too, plus the per-component rules for the skeleton shimmer and the streaming caret. Tested: after a drill and after opening and closing the palette, `document.getAnimations()` is empty.
- **Density.** Overview: header row 56 px, controls 36, rows 44, KPI 28. Analyst: header row 48, toolbar 40, controls 28, rows 32, KPI 20. Computed styles are asserted in both themes.
- **Scrolling content.** The assistant list does not pull a reader back to the bottom: any wheel, touch or scroll-key input ends the follow window that follows a new question (WCAG 2.2.2, user control of moving content).
- **Responsive.** No horizontal page scroll at 768, 1024, 1280 and 1440 px on both modes (tested). The 390 px layout is the mobile slice's; the two 390 px cases in `slice11.spec.ts` are marked `fixme` until it lands.

## Landmarks and headings

- One `h1` (the wordmark) and one page `h2` per mode. On the Overview the `h2` is the verdict sentence; the dashboard section is labelled with `aria-label="Dashboard"` rather than a hidden heading.
- Status is never colour alone: chips, badges and region headings pair a glyph shape (dot, triangle, diamond) with text or an accessible name.
- Region bars are `role="img"` with `aria-label="Europe, 95.4% of forecast"`; the figures are also visible text beside them.

## Contrast

Generated from `pnpm check:contrast`, which reads `src/app/tokens.css`. Text pairs need 4.5:1, graphics and focus rings 3:1; `map-land` is a non-text pair held to 1.15:1 (land must be visible without competing with the data), decorative rules have no requirement.

<!-- contrast:start -->
| Pair (foreground/background) | Kind | Needs | Light | Dark |
| --- | --- | --- | --- | --- |
| `ink/surface` | text | 4.5:1 | 17.36:1 | 13.62:1 |
| `ink/bg` | text | 4.5:1 | 14.86:1 | 14.94:1 |
| `ink-2/surface` | text | 4.5:1 | 7.19:1 | 7.63:1 |
| `ink-2/bg` | text | 4.5:1 | 6.15:1 | 8.37:1 |
| `ink-2/surface-2` | text | 4.5:1 | 5.62:1 | 6.82:1 |
| `ink-muted/surface` | text | 4.5:1 | 6.14:1 | 5.52:1 |
| `ink-muted/bg` | text | 4.5:1 | 5.25:1 | 6.06:1 |
| `ink-muted/surface-2` | text | 4.5:1 | 4.79:1 | 4.93:1 |
| `accent/surface` | text | 4.5:1 | 8.59:1 | 7.80:1 |
| `accent/bg` | text | 4.5:1 | 7.36:1 | 8.55:1 |
| `accent/accent-soft` | text | 4.5:1 | 7.15:1 | 6.26:1 |
| `on-accent/accent` | text | 4.5:1 | 8.59:1 | 8.55:1 |
| `ok-text/ok-bg` | text | 4.5:1 | 5.59:1 | 8.65:1 |
| `ok-text/surface` | text | 4.5:1 | 6.52:1 | 10.03:1 |
| `warn-text/warn-bg` | text | 4.5:1 | 6.30:1 | 8.43:1 |
| `warn-text/surface` | text | 4.5:1 | 7.20:1 | 10.56:1 |
| `warn-text/accent-soft` | text | 4.5:1 | 5.99:1 | 8.48:1 |
| `bad-text/bad-bg` | text | 4.5:1 | 5.68:1 | 7.41:1 |
| `bad-text/surface` | text | 4.5:1 | 7.07:1 | 8.26:1 |
| `ai-label/ai-bg` | text | 4.5:1 | 8.57:1 | 8.19:1 |
| `ink/ai-bg` | text | 4.5:1 | 14.69:1 | 12.42:1 |
| `ink/accent-soft` | text | 4.5:1 | 14.45:1 | 10.93:1 |
| `ink/bad-bg` | text | 4.5:1 | 13.96:1 | 12.21:1 |
| `ink-2/bad-bg` | text | 4.5:1 | 5.78:1 | 6.84:1 |
| `on-bad/bad-mark` | text | 4.5:1 | 5.45:1 | 5.68:1 |
| `ok-mark/surface` | graphic | 3:1 | 4.25:1 | 7.35:1 |
| `warn-mark/surface` | graphic | 3:1 | 3.65:1 | 7.85:1 |
| `bad-mark/surface` | graphic | 3:1 | 5.45:1 | 5.18:1 |
| `bad-mark/bad-bg` | graphic | 3:1 | 4.38:1 | 4.64:1 |
| `focus/surface` | graphic | 3:1 | 8.59:1 | 7.80:1 |
| `series-actual/surface` | graphic | 3:1 | 17.36:1 | 13.62:1 |
| `series-forecast/surface` | graphic | 3:1 | 6.46:1 | 5.17:1 |
| `series-prior/surface` | graphic | 3:1 | 4.39:1 | 5.52:1 |
| `cat-1/surface` | graphic | 3:1 | 6.46:1 | 5.17:1 |
| `cat-2/surface` | graphic | 3:1 | 4.13:1 | 5.08:1 |
| `cat-3/surface` | graphic | 3:1 | 3.99:1 | 4.77:1 |
| `cat-4/surface` | graphic | 3:1 | 3.25:1 | 5.15:1 |
| `cat-5/surface` | graphic | 3:1 | 5.25:1 | 4.60:1 |
| `cat-6/surface` | graphic | 3:1 | 4.20:1 | 5.26:1 |
| `map-land/surface` | non-text | 1.15:1 | 1.28:1 | 1.18:1 |
| `border/surface` | decorative | none | 1.97:1 | 1.54:1 |
| `grid/surface` | decorative | none | 1.34:1 | 1.25:1 |
| `surface-2/surface` | decorative | none | 1.28:1 | 1.12:1 |
| `ai-border/ai-bg` | decorative | none | 2.91:1 | 3.01:1 |
| `bg/surface` | decorative | none | 1.17:1 | 1.10:1 |
<!-- contrast:end -->

## What is tested

- axe (`wcag2a`, `wcag2aa`, `wcag21aa`) with zero violations on Overview, Overview with an open answer, Overview with the palette open, Analyst with the rail collapsed and with it open, in light and dark.
- The Tab order above, the five-width scroll check, reduced motion, theme persistence, density computed styles.
- Per-feature axe and keyboard checks live in each slice's spec; stories run in light and dark (`pnpm test:stories`).
