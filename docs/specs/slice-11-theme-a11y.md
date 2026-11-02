# Slice 11: Theme, density and accessibility pass. Spec

Depends on all previous. Inputs: design-system.md §0, §5, §10; user-flows.md slice 11.

## 1. Work
- Audit every component against design-system.md §10 and the per-component ARIA notes. Fix, do not redesign.
- Theme: verify the pre-paint script, persistence, OS fallback, and that every chart and chip re-renders on toggle (CSS variables only; no JS colour lookups cached at mount — if any exist, read `getComputedStyle` on theme change or switch them to CSS).
- Density: verify header heights (56/48), row heights (44/32), control heights (36/28) with computed styles.
- Reduced motion: `getAnimations()` returns none under the OS setting and under the override; chart transitions are CSS and respect it.
- Responsive: 390, 768, 1024, 1440 px: no horizontal scroll; aside below the dashboard < 1024; the sources table scrolls inside its region; the heat map scrolls inside its card at 390.
- Keyboard tour documented in `docs/accessibility.md`: the full Tab order and every shortcut (chart arrows, heat map grid keys, segmented controls, Escape for tooltips and dialogs).
- Contrast table from `check:contrast` pasted into `docs/accessibility.md`.

## 2. Tests first
- `tests/e2e/slice11.spec.ts`: the four criteria from user-flows.md slice 11 verbatim (theme toggle persists and OS fallback; `getAnimations()` empty under reduce; axe zero violations on `/`, `/?mode=analyst&region=eu&market=de`, and the panel with an open answer, in both themes; no horizontal scroll at the four widths).
- Component accessibility is covered by the Storybook a11y addon on every story (slice 0 §10.0, `test: "error"`); no separate per-component axe tests. In this slice: confirm every `ui/components`, `ui/charts` and client `features/**` component has at least one story; add any that are missing; run `pnpm test:stories` with the dark project if it exists, otherwise switch the Storybook toolbar to dark and check the a11y panel on each story by hand and list the result in the report.
