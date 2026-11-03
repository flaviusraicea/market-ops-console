# Accessibility notes

## Tab order on `/` (Overview, portfolio, light)

Recorded from the production build at 1440 px, starting at the skip link:

1. Skip to content
2. Period select
3. Overview / Analyst mode switch
4. Theme toggle
5. Verdict info button (`About this verdict`), which opens the provenance tooltip on focus
6. Status strip: for each region in order, the region heading button (`Drill into Europe · 5`), then its market chips (United States, Canada; Germany, Spain, Italy, United Kingdom, France; Japan, China, India, Australia; Brazil, Mexico)
7. The four tile info buttons (`About portfolio revenue` and so on). Needs attention: each market name, then its `Ask why` button, for the six flagged markets, then the three top movers (market names only)
8. Markets by status: `View as table`, then the map's markets (no metric control on this view)
9. By region: the four region name buttons
10. Assistant panel: composer, send button, then the suggested questions

The assistant column follows the dashboard in the DOM, so on a keyboard it is reached last; `Ask why` moves focus into its composer.

## Landmarks and headings

- One `h1` (the wordmark) and one page `h2` per mode. On the Overview the `h2` is the verdict sentence; the dashboard section is labelled with `aria-label="Dashboard"` rather than a hidden heading.
- Status is never colour alone: chips, badges and region headings pair a glyph shape (dot, triangle, diamond) with text or an accessible name.
- Region bars are `role="img"` with `aria-label="Europe, 95.4% of forecast"`; the figures are also visible text beside them.
