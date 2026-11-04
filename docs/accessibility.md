# Accessibility notes

The console targets WCAG 2.1 AA. What is checked automatically, and where, is listed at the end; this page also holds the keyboard reference and the contrast table.

## Keyboard tour

### Tab order

Recorded from the production build at 1440 px, one Tab at a time from the skip link, and asserted by `tests/e2e/accessibility.spec.ts`. The lists below are generated from `tests/e2e/tab-order.ts` (`pnpm docs:a11y`); a label is the focused element's accessible name, or its text. Charts and the map are one tab stop each and move inside with the arrow keys. The assistant column follows the dashboard in the DOM, so on a keyboard it is reached last; `Ask why` moves focus into its composer.

<!-- tab-order:start -->
#### Executive (`/`)

1. Skip to content
2. Live
3. Paused
4. Executive
5. Switch to dark theme
6. Signed in as Dana Whitfield, Executive role, alerts read-only. Account menu
7. Period
8. Product. Select a market first.
9. About this verdict
10. Drill into North America · 2
11. United States, on track
12. Canada, on track
13. Drill into Europe · 5
14. Germany, off track
15. Spain, off track
16. Italy, at risk
17. United Kingdom, at risk
18. France, at risk
19. Drill into APAC · 4
20. Japan, on track
21. China, on track
22. India, on track
23. Australia, on track
24. Drill into LATAM · 2
25. Brazil, at risk
26. Mexico, on track
27. About portfolio revenue
28. About forecast attainment
29. About year-on-year growth
30. About markets needing attention
31. Germany
32. Ask why Germany dipped
33. Spain
34. Ask why Spain is off track
35. Italy
36. Ask why Italy is at risk
37. United Kingdom
38. Ask why United Kingdom is at risk
39. Brazil
40. Ask why Brazil is at risk
41. France
42. Ask why France is at risk
43. Drill into China, On track, +18.2%
44. Drill into France, At risk, +11.6%
45. Drill into Canada, On track, +10.7%
46. Drill into Germany, Off track, −9.7%
47. Drill into Spain, Off track, −4.6%
48. View as table of the markets map
49. Australia, on track, 101.8% attainment
50. Drill into North America, $4.38M, On track, 101.0%
51. Drill into Europe, $7.06M, At risk, 95.4%
52. Drill into APAC, $9.49M, On track, 104.9%
53. Drill into LATAM, $1.92M, At risk, 98.0%
54. Collapse assistant
55. Ask about a market or period…
56. Send
57. Open command palette
58. Which markets are at risk?
59. Why did Germany dip?
60. Compare APAC and Europe

#### Analyst, Germany (`/?mode=analyst&region=eu&market=de`)

1. Skip to content
2. Portfolio
3. Europe
4. Live
5. Paused
6. Analyst
7. Switch to dark theme
8. Signed in as Dana Whitfield, Executive role, alerts read-only. Account menu
9. Period
10. Product
11. Month
12. Status rule
13. All facts
14. About Germany revenue
15. About forecast attainment
16. About year-on-year growth
17. About status
18. Products · Germany, scrollable
19. Product
20. Revenue
21. Forecast
22. Prior year
23. Attainment
24. Growth YoY
25. Units
26. Veltrix $574K $620K $639K 92.7% −10.1% 3,431
27. Nuvora $405K $445K $444K 91.1% −8.7% 1,120
28. Orbispan $322K $350K $355K 91.9% −9.3% 1,157
29. Calyx $229K $245K $257K 93.4% −10.9% 858
30. Zephyra $147K $159K $163K 92.6% −10.0% 1,052
31. Attainment
32. View as table of the markets map
33. Germany, off track, 92.0% attainment
34. Drill into North America, $4.38M, On track, 101.0%
35. Drill into Europe, $7.06M, At risk, 95.4%
36. Drill into APAC, $9.49M, On track, 104.9%
37. Drill into LATAM, $1.92M, At risk, 98.0%
38. View as table of the Germany revenue chart
39. Month
40. Anomaly: March 2026 revenue fell 27 percent versus February
41. View as table of the compare radar chart
42. France, Attainment: 96.4%
43. View as table of the attainment by month heat map
44. Germany, May 2026, 92.2% of forecast
45. AlertsNo rules
46. Open assistant
47. Open command palette
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
- **Rail and panel**: opening with the rail toggle moves focus to the panel heading; opening from an entry point (`Ask why`, a heat map cell, an anomaly marker, the palette) moves focus to the composer. Between 1024 and 1279 px the open panel overlays the dashboard with a scrim and Tab wraps inside it; from 1280 px it pushes the dashboard and does not trap.
- **Live region** for "Answer complete", "Answer stopped, no sources" and "Request failed, no sources" stays mounted while the panel is collapsed, so the announcement is not lost.
- **Palette** is a modal dialog: focus starts in its input, is trapped inside, and returns to the opener on `Esc` or on a command that does not move focus elsewhere.


## Preferences and layout

- **Theme.** A pre-paint script sets `data-theme` from `localStorage`, falling back to `prefers-color-scheme`; a saved choice wins over the OS. Every colour is a CSS variable (including `--map-land`), so charts and chips re-colour on toggle with no JS lookup. Tested in `accessibility.spec.ts`.
- **Reduced motion.** `prefers-reduced-motion: reduce` and the console's own `html[data-reduced-motion="true"]` (palette command) apply one blanket rule in `globals.css` that sets animation and transition durations to zero, so Radix and shadcn enter and exit animations stop too, plus the per-component rules for the skeleton shimmer and the streaming caret. Tested: after a drill and after opening and closing the palette, `document.getAnimations()` is empty.
- **Density.** Overview: header row 56 px, controls 36, rows 44, KPI 28. Analyst: header row 48, toolbar 40, controls 28, rows 32, KPI 20. Computed styles are asserted in both themes.
- **Scrolling content.** The assistant list does not pull a reader back to the bottom: any wheel, touch or scroll-key input ends the follow window that follows a new question (WCAG 2.2.2, user control of moving content).
- **Responsive.** No horizontal page scroll at 390, 768, 1024, 1280 and 1440 px on both modes (`accessibility.spec.ts`), and on the iPhone 14 and iPad (gen 7) profiles (`mobile.spec.ts`). Wide tables and the heat map scroll inside their own focusable, labelled region; the heat map opens at the latest months. The seven-bin legend is a focusable row that scrolls on a phone.
- **Touch targets.** On a touch screen every button, link and field is at least 44 × 44 CSS px (chips 36 px tall); asserted in `mobile.spec.ts` on both pages. Chart marks (map countries, radar and line points, heat cells) are exempt because each chart has a table twin; the map shows its table first under 768 px.
- **Phone assistant.** Under 1024 px the assistant is a modal bottom sheet (`role="dialog"`, name "Assistant"): focus moves to the composer when it is opened from the bar, Escape or a tap on the scrim closes it and focus returns to the bar button. Ask why buttons and citations open or close it without raising the keyboard.

## Landmarks and headings

- One `h1` (the wordmark) and one page `h2` per mode. On the Overview the `h2` is the verdict sentence; the dashboard section is labelled with `aria-label="Dashboard"` rather than a hidden heading.
- Status is never colour alone: chips, badges and region headings pair a glyph shape (dot, triangle, diamond) with text or an accessible name.
- Region bars are `role="img"` with `aria-label="Europe, 95.4% of forecast"`; the figures are also visible text beside them.

## Contrast

Generated from `pnpm check:contrast`, which reads `src/app/tokens.css`. Text pairs need 4.5:1, graphics and focus rings 3:1; `map-land` is a non-text pair held to 1.15:1 (land must be visible without competing with the data), decorative rules have no requirement.

<!-- contrast:start -->
| Pair (foreground/background) | Kind | Needs | Light | Dark |
| --- | --- | --- | --- | --- |
| `ink/surface` | text | 4.5:1 | 17.36:1 | 14.33:1 |
| `ink/bg` | text | 4.5:1 | 13.29:1 | 16.02:1 |
| `ink-2/surface` | text | 4.5:1 | 7.19:1 | 8.46:1 |
| `ink-2/bg` | text | 4.5:1 | 5.50:1 | 9.46:1 |
| `ink-2/surface-2` | text | 4.5:1 | 5.62:1 | 7.44:1 |
| `ink-muted/surface` | text | 4.5:1 | 6.14:1 | 5.94:1 |
| `ink-muted/bg` | text | 4.5:1 | 4.70:1 | 6.64:1 |
| `ink-muted/surface-2` | text | 4.5:1 | 4.79:1 | 5.23:1 |
| `accent/surface` | text | 4.5:1 | 8.59:1 | 8.09:1 |
| `accent/bg` | text | 4.5:1 | 6.58:1 | 9.05:1 |
| `accent/accent-soft` | text | 4.5:1 | 7.15:1 | 6.78:1 |
| `on-accent/accent` | text | 4.5:1 | 8.59:1 | 8.72:1 |
| `ink/surface-raised` | text | 4.5:1 | 17.36:1 | 12.60:1 |
| `ink-2/surface-raised` | text | 4.5:1 | 7.19:1 | 7.44:1 |
| `ink-muted/surface-raised` | text | 4.5:1 | 6.14:1 | 5.23:1 |
| `accent/surface-raised` | text | 4.5:1 | 8.59:1 | 7.12:1 |
| `ink/surface-overlay` | text | 4.5:1 | 17.36:1 | 10.89:1 |
| `ink-2/surface-overlay` | text | 4.5:1 | 7.19:1 | 6.43:1 |
| `ink-muted/surface-overlay` | text | 4.5:1 | 6.14:1 | 4.51:1 |
| `accent/surface-overlay` | text | 4.5:1 | 8.59:1 | 6.15:1 |
| `ok-text/surface-raised` | text | 4.5:1 | 6.52:1 | 9.17:1 |
| `warn-text/surface-raised` | text | 4.5:1 | 7.20:1 | 9.66:1 |
| `bad-text/surface-raised` | text | 4.5:1 | 7.07:1 | 7.55:1 |
| `ai-label/surface-raised` | text | 4.5:1 | 10.12:1 | 8.21:1 |
| `ok-text/ok-bg` | text | 4.5:1 | 5.59:1 | 9.25:1 |
| `ok-text/surface` | text | 4.5:1 | 6.52:1 | 10.43:1 |
| `warn-text/warn-bg` | text | 4.5:1 | 6.30:1 | 9.12:1 |
| `warn-text/surface` | text | 4.5:1 | 7.20:1 | 10.98:1 |
| `warn-text/accent-soft` | text | 4.5:1 | 5.99:1 | 9.20:1 |
| `bad-text/bad-bg` | text | 4.5:1 | 5.68:1 | 7.57:1 |
| `bad-text/surface` | text | 4.5:1 | 7.07:1 | 8.59:1 |
| `ai-label/ai-bg` | text | 4.5:1 | 8.57:1 | 8.56:1 |
| `ink/ai-bg` | text | 4.5:1 | 14.69:1 | 13.14:1 |
| `ink-muted/ai-bg` | text | 4.5:1 | 5.19:1 | 5.45:1 |
| `ink/accent-soft` | text | 4.5:1 | 14.45:1 | 12.01:1 |
| `ink/bad-bg` | text | 4.5:1 | 13.96:1 | 12.62:1 |
| `ink-2/bad-bg` | text | 4.5:1 | 5.78:1 | 7.45:1 |
| `on-bad/bad-mark` | text | 4.5:1 | 5.45:1 | 5.80:1 |
| `ok-display/ok-bg` | large text | 3:1 | 3.75:1 | 9.25:1 |
| `warn-display/warn-bg` | large text | 3:1 | 4.46:1 | 9.12:1 |
| `bad-display/bad-bg` | large text | 3:1 | 4.38:1 | 7.57:1 |
| `ok-mark/surface` | graphic | 3:1 | 4.25:1 | 7.64:1 |
| `warn-mark/surface` | graphic | 3:1 | 4.65:1 | 8.16:1 |
| `bad-mark/surface` | graphic | 3:1 | 5.45:1 | 5.38:1 |
| `ok-mark/bg` | graphic | 3:1 | 3.25:1 | 8.54:1 |
| `warn-mark/bg` | graphic | 3:1 | 3.56:1 | 9.12:1 |
| `bad-mark/bg` | graphic | 3:1 | 4.17:1 | 6.02:1 |
| `bad-mark/bad-bg` | graphic | 3:1 | 4.38:1 | 4.74:1 |
| `focus/surface` | graphic | 3:1 | 8.59:1 | 8.09:1 |
| `focus/bg` | graphic | 3:1 | 6.58:1 | 9.05:1 |
| `focus/surface-raised` | graphic | 3:1 | 8.59:1 | 7.12:1 |
| `focus/surface-overlay` | graphic | 3:1 | 8.59:1 | 6.15:1 |
| `series-actual/surface` | graphic | 3:1 | 8.59:1 | 8.09:1 |
| `series-forecast/surface` | graphic | 3:1 | 7.19:1 | 8.46:1 |
| `series-prior/surface` | graphic | 3:1 | 4.39:1 | 5.94:1 |
| `cat-1/surface` | graphic | 3:1 | 6.46:1 | 5.37:1 |
| `cat-2/surface` | graphic | 3:1 | 4.13:1 | 5.28:1 |
| `cat-3/surface` | graphic | 3:1 | 3.99:1 | 4.96:1 |
| `cat-4/surface` | graphic | 3:1 | 3.25:1 | 5.36:1 |
| `cat-5/surface` | graphic | 3:1 | 5.25:1 | 4.78:1 |
| `cat-6/surface` | graphic | 3:1 | 4.20:1 | 5.46:1 |
| `ai-border/ai-bg` | decorative | none | 2.91:1 |  |
| `border-control/surface` | non-text | 3:1 | 4.32:1 | 4.52:1 |
| `border-control/bg` | non-text | 3:1 | 3.31:1 | 5.05:1 |
| `border-control/surface-2` | non-text | 3:1 | 3.38:1 | 3.97:1 |
| `border-control/ai-bg` | non-text | 3:1 | 3.66:1 | 4.14:1 |
| `border-control/accent-soft` | non-text | 3:1 | 3.60:1 | 3.78:1 |
| `border-control/surface-raised` | non-text | 3:1 | 4.32:1 | 3.97:1 |
| `border-control/surface-overlay` | non-text | 3:1 | 4.32:1 | 3.43:1 |
| `map-land/surface` | non-text | 1.15:1 | 1.87:1 | 1.16:1 |
| `border/surface` | decorative | none | 1.70:1 | 1.60:1 |
| `border/bg` | decorative | none | 1.30:1 | 1.78:1 |
| `border/surface-raised` | decorative | none | 1.70:1 | 1.40:1 |
| `grid/surface` | decorative | none | 1.34:1 | 1.26:1 |
| `surface-2/surface` | decorative | none | 1.28:1 | 1.14:1 |
| `bg/surface` | decorative | none | 1.31:1 | 1.12:1 |
| `surface-raised/surface` | decorative | none | 1.00:1 | 1.14:1 |
| `surface-overlay/surface` | decorative | none | 1.00:1 | 1.32:1 |
| `ai-border/ai-bg` | graphic | 3:1 |  | 3.69:1 |
<!-- contrast:end -->

## What is tested

- axe (`wcag2a`, `wcag2aa`, `wcag21aa`) with zero violations on Overview, Overview with an open answer, Overview with the palette open, Analyst with the rail collapsed and with it open, in light and dark.
- The Tab order above, the five-width scroll check, reduced motion, theme persistence, density computed styles.
- Per-feature axe and keyboard checks live in each feature's spec; stories run in light and dark (`pnpm test:stories`).
