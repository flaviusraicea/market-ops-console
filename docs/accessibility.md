# Accessibility notes

The console targets WCAG 2.1 AA. What is checked automatically, and where, is listed at the end; this page also holds the keyboard reference and the contrast table.

## Keyboard tour

### Tab order

Recorded from the production build at 1440 px, one Tab at a time from the skip link, and asserted by `tests/e2e/slice11.spec.ts`. The lists below are generated from `tests/e2e/tabOrder.ts` (`pnpm docs:a11y`); a label is the focused element's accessible name, or its text. Charts and the map are one tab stop each and move inside with the arrow keys. The assistant column follows the dashboard in the DOM, so on a keyboard it is reached last; `Ask why` moves focus into its composer.

<!-- tab-order:start -->
#### Executive (`/`)

1. Skip to content
2. Period
3. Live
4. Paused
5. Executive
6. Switch to dark theme
7. Signed in as Dana Whitfield, Executive role, alerts read-only. Account menu
8. About this verdict
9. Drill into North America · 2
10. United States, on track
11. Canada, on track
12. Drill into Europe · 5
13. Germany, off track
14. Spain, off track
15. Italy, at risk
16. United Kingdom, at risk
17. France, at risk
18. Drill into APAC · 4
19. Japan, on track
20. China, on track
21. India, on track
22. Australia, on track
23. Drill into LATAM · 2
24. Brazil, at risk
25. Mexico, on track
26. About portfolio revenue
27. About forecast attainment
28. About year-on-year growth
29. About markets needing attention
30. Germany
31. Ask why Germany dipped
32. Spain
33. Ask why Spain is off track
34. Italy
35. Ask why Italy is at risk
36. United Kingdom
37. Ask why United Kingdom is at risk
38. Brazil
39. Ask why Brazil is at risk
40. France
41. Ask why France is at risk
42. China
43. France
44. Canada
45. Germany
46. Spain
47. View as table of the markets map
48. Australia, on track, 101.8% attainment
49. Drill into North America
50. Drill into Europe
51. Drill into APAC
52. Drill into LATAM
53. Collapse assistant
54. Ask about a market or period…
55. Send
56. Open command palette
57. Which markets are at risk?
58. Why did Germany dip?
59. Compare APAC and Europe

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
14. Products · Germany, scrollable
15. Product
16. Revenue
17. Forecast
18. Prior year
19. Attainment
20. Growth YoY
21. Units
22. Veltrix $0.57M $0.62M $0.64M 92.7% −10.1% 3,431
23. Nuvora $0.40M $0.44M $0.44M 91.1% −8.7% 1,120
24. Orbispan $0.32M $0.35M $0.35M 91.9% −9.3% 1,157
25. Calyx $0.23M $0.24M $0.26M 93.4% −10.9% 858
26. Zephyra $0.15M $0.16M $0.16M 92.6% −10.0% 1,052
27. Attainment
28. View as table of the markets map
29. Germany, off track, 92.0% attainment
30. Drill into North America
31. Drill into Europe
32. Drill into APAC
33. Drill into LATAM
34. View as table of the Germany revenue chart
35. Month
36. Anomaly: March 2026 revenue fell 27 percent versus February
37. View as table of the compare radar chart
38. France, Attainment: 96.4%
39. View as table of the attainment by month heat map
40. Germany, May 2026, 92.2% of forecast
41. Alerts0 rules · Growth below · Attainment below
42. Open assistant
43. Open command palette
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
- **Responsive.** No horizontal page scroll at 390, 768, 1024, 1280 and 1440 px on both modes (`slice11.spec.ts`), and on the iPhone 14 and iPad (gen 7) profiles (`slice20.spec.ts`). Wide tables and the heat map scroll inside their own focusable, labelled region; the heat map opens at the latest months. The seven-bin legend is a focusable row that scrolls on a phone.
- **Touch targets.** On a touch screen every button, link and field is at least 44 × 44 CSS px (chips 36 px tall); asserted in `slice20.spec.ts` on both pages. Chart marks (map countries, radar and line points, heat cells) are exempt because each chart has a table twin; the map shows its table first under 768 px.
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
| `ink/surface` | text | 4.5:1 | 17.36:1 | 14.18:1 |
| `ink/bg` | text | 4.5:1 | 13.29:1 | 15.44:1 |
| `ink-2/surface` | text | 4.5:1 | 7.19:1 | 8.37:1 |
| `ink-2/bg` | text | 4.5:1 | 5.50:1 | 9.12:1 |
| `ink-2/surface-2` | text | 4.5:1 | 5.62:1 | 7.45:1 |
| `ink-muted/surface` | text | 4.5:1 | 6.14:1 | 5.88:1 |
| `ink-muted/bg` | text | 4.5:1 | 4.70:1 | 6.40:1 |
| `ink-muted/surface-2` | text | 4.5:1 | 4.79:1 | 5.23:1 |
| `accent/surface` | text | 4.5:1 | 8.59:1 | 8.01:1 |
| `accent/bg` | text | 4.5:1 | 6.58:1 | 8.72:1 |
| `accent/accent-soft` | text | 4.5:1 | 7.15:1 | 6.78:1 |
| `on-accent/accent` | text | 4.5:1 | 8.59:1 | 8.72:1 |
| `ink/surface-raised` | text | 4.5:1 | 17.36:1 | 12.62:1 |
| `ink-2/surface-raised` | text | 4.5:1 | 7.19:1 | 7.45:1 |
| `ink-muted/surface-raised` | text | 4.5:1 | 6.14:1 | 5.23:1 |
| `accent/surface-raised` | text | 4.5:1 | 8.59:1 | 7.13:1 |
| `ink/surface-overlay` | text | 4.5:1 | 17.36:1 | 11.68:1 |
| `ink-2/surface-overlay` | text | 4.5:1 | 7.19:1 | 6.90:1 |
| `ink-muted/surface-overlay` | text | 4.5:1 | 6.14:1 | 4.84:1 |
| `accent/surface-overlay` | text | 4.5:1 | 8.59:1 | 6.60:1 |
| `ok-text/surface-raised` | text | 4.5:1 | 6.52:1 | 9.18:1 |
| `warn-text/surface-raised` | text | 4.5:1 | 7.20:1 | 9.67:1 |
| `bad-text/surface-raised` | text | 4.5:1 | 7.07:1 | 7.56:1 |
| `ai-label/surface-raised` | text | 4.5:1 | 10.12:1 | 8.22:1 |
| `ok-text/ok-bg` | text | 4.5:1 | 5.59:1 | 9.25:1 |
| `ok-text/surface` | text | 4.5:1 | 6.52:1 | 10.32:1 |
| `warn-text/warn-bg` | text | 4.5:1 | 6.30:1 | 9.12:1 |
| `warn-text/surface` | text | 4.5:1 | 7.20:1 | 10.87:1 |
| `warn-text/accent-soft` | text | 4.5:1 | 5.99:1 | 9.20:1 |
| `bad-text/bad-bg` | text | 4.5:1 | 5.68:1 | 7.57:1 |
| `bad-text/surface` | text | 4.5:1 | 7.07:1 | 8.50:1 |
| `ai-label/ai-bg` | text | 4.5:1 | 8.57:1 | 8.56:1 |
| `ink/ai-bg` | text | 4.5:1 | 14.69:1 | 13.14:1 |
| `ink/accent-soft` | text | 4.5:1 | 14.45:1 | 12.01:1 |
| `ink/bad-bg` | text | 4.5:1 | 13.96:1 | 12.62:1 |
| `ink-2/bad-bg` | text | 4.5:1 | 5.78:1 | 7.45:1 |
| `on-bad/bad-mark` | text | 4.5:1 | 5.45:1 | 5.80:1 |
| `ok-display/ok-bg` | large text | 3:1 | 3.75:1 | 9.25:1 |
| `warn-display/warn-bg` | large text | 3:1 | 4.46:1 | 9.12:1 |
| `bad-display/bad-bg` | large text | 3:1 | 4.38:1 | 7.57:1 |
| `ok-mark/surface` | graphic | 3:1 | 4.25:1 | 7.56:1 |
| `warn-mark/surface` | graphic | 3:1 | 4.65:1 | 8.07:1 |
| `bad-mark/surface` | graphic | 3:1 | 5.45:1 | 5.33:1 |
| `ok-mark/bg` | graphic | 3:1 | 3.25:1 | 8.23:1 |
| `warn-mark/bg` | graphic | 3:1 | 3.56:1 | 8.79:1 |
| `bad-mark/bg` | graphic | 3:1 | 4.17:1 | 5.80:1 |
| `bad-mark/bad-bg` | graphic | 3:1 | 4.38:1 | 4.74:1 |
| `focus/surface` | graphic | 3:1 | 8.59:1 | 8.01:1 |
| `focus/bg` | graphic | 3:1 | 6.58:1 | 8.72:1 |
| `focus/surface-raised` | graphic | 3:1 | 8.59:1 | 7.13:1 |
| `focus/surface-overlay` | graphic | 3:1 | 8.59:1 | 6.60:1 |
| `series-actual/surface` | graphic | 3:1 | 17.36:1 | 14.18:1 |
| `series-forecast/surface` | graphic | 3:1 | 6.46:1 | 5.31:1 |
| `series-prior/surface` | graphic | 3:1 | 4.39:1 | 5.88:1 |
| `cat-1/surface` | graphic | 3:1 | 6.46:1 | 5.31:1 |
| `cat-2/surface` | graphic | 3:1 | 4.13:1 | 5.23:1 |
| `cat-3/surface` | graphic | 3:1 | 3.99:1 | 4.91:1 |
| `cat-4/surface` | graphic | 3:1 | 3.25:1 | 5.30:1 |
| `cat-5/surface` | graphic | 3:1 | 5.25:1 | 4.73:1 |
| `cat-6/surface` | graphic | 3:1 | 4.20:1 | 5.41:1 |
| `ai-border/ai-bg` | decorative | none | 2.91:1 |  |
| `border-control/surface` | non-text | 3:1 | 4.32:1 | 4.47:1 |
| `border-control/bg` | non-text | 3:1 | 3.31:1 | 4.87:1 |
| `border-control/surface-2` | non-text | 3:1 | 3.38:1 | 3.98:1 |
| `border-control/ai-bg` | non-text | 3:1 | 3.66:1 | 4.14:1 |
| `border-control/accent-soft` | non-text | 3:1 | 3.60:1 | 3.78:1 |
| `border-control/surface-raised` | non-text | 3:1 | 4.32:1 | 3.98:1 |
| `border-control/surface-overlay` | non-text | 3:1 | 4.32:1 | 3.68:1 |
| `map-land/surface` | non-text | 1.15:1 | 1.28:1 | 1.18:1 |
| `border/surface` | decorative | none | 1.70:1 | 1.48:1 |
| `border/bg` | decorative | none | 1.30:1 | 1.61:1 |
| `border/surface-raised` | decorative | none | 1.70:1 | 1.32:1 |
| `grid/surface` | decorative | none | 1.34:1 | 1.21:1 |
| `surface-2/surface` | decorative | none | 1.28:1 | 1.12:1 |
| `bg/surface` | decorative | none | 1.31:1 | 1.09:1 |
| `surface-raised/surface` | decorative | none | 1.00:1 | 1.12:1 |
| `surface-overlay/surface` | decorative | none | 1.00:1 | 1.21:1 |
| `ai-border/ai-bg` | graphic | 3:1 |  | 3.69:1 |
<!-- contrast:end -->

## What is tested

- axe (`wcag2a`, `wcag2aa`, `wcag21aa`) with zero violations on Overview, Overview with an open answer, Overview with the palette open, Analyst with the rail collapsed and with it open, in light and dark.
- The Tab order above, the five-width scroll check, reduced motion, theme persistence, density computed styles.
- Per-feature axe and keyboard checks live in each slice's spec; stories run in light and dark (`pnpm test:stories`).
