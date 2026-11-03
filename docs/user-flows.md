# User flows as build slices

**Status: approved by Flavius on 2026-11-02.** Answers: heat map confirmed for slice 4; the facts table follows Context; delete stays, behind a confirm dialog (one click opens the dialog, confirm deletes).

Each flow is one build slice and one test. Order is the build sequence: each slice only depends on the ones above it. Acceptance criteria are written as Given / When / Then so they map one-to-one onto Playwright E2E tests (marked E2E) or component and unit tests (marked C or U). Vocabulary follows domain-model.md; visuals follow design-system.md.

Conventions
- "Context" means the URL state `{region, market, product, period, mode, metric, basis, cite}`; defaults are portfolio, 2026-05, overview, attainment, month.
- "Latest period" is May 2026. All sample values are the ones in preview-spec.md section 9 and domain-model.md section 5.
- Every slice ends with: axe reports zero violations on the screens it touched, and the screens render in light, dark, overview and analyst.

---

## Slice 0: Foundation (no user flow)

Scope: domain layer (zod schema for data.json and SSE events, selectors 5.1 to 5.10, citation resolver, alert evaluator), tokens.css with the Tailwind theme map, the app shell (header with breadcrumbs, stamp, mode switch, theme toggle), and the Context hook over the URL.

Acceptance (U unless stated)
- Given data.json, when it is parsed, then the schema accepts it and produces 4 regions, 13 markets, 5 products, 24 periods and 1,560 facts.
- Given the Germany facts for May 2026, when attainment is computed, then it equals 92.2 and the market KPI reads 92.0.
- Given the portfolio for May 2026, when totals are computed, then revenue is 22,850,419, attainment 100.4 and growth 7.3.
- Given the portfolio, when YTD is computed, then it covers 2026-01 to 2026-05 and attainment is 100.2; when MAT is computed for 2026-05, then it sums 12 periods to 277,150,778.
- Given a citation `{marketId: "de", productId: "veltrix", period: "2026-03"}`, when resolved, then the target is market × product scope at 2026-03 with actual 427,196.
- Given a citation with `marketId: "xx"`, when resolved, then the result is `unresolved` and never throws.
- Given the rule "attainment below 95" with scope Europe, when evaluated at the latest period, then it returns Germany, the UK and Italy.
- Given the token file, when the contrast script runs, then every text pair is at least 4.5:1 and every graphic pair at least 3:1 in both themes (CI).
- Given the URL `/?region=eu&market=de&period=2026-03&mode=analyst`, when the Context hook reads it, then it returns those values; given `?market=de` alone, then region resolves to `eu`.

---

## Slice 1: Reviewer cold open

User and job: the reviewer, or any first visit. "Understand what this is and what it can do in under a minute, with no demo."

Steps
1. Open `/`.
2. See the header (wordmark, breadcrumbs at Portfolio, period May 2026, stamp "Data through May 2026", mode switch on Overview, theme toggle).
3. See the Overview dashboard (slice 2) and the assistant panel open on the right with three suggestion chips: "Which markets are at risk?", "Why did Germany dip?", "Compare APAC and Europe".
4. See the assistant's empty state: one sentence "Ask about markets, products or periods. Answers cite the data they use." and the three chips.

States: loading (skeleton tiles and skeleton panel, `aria-busy`), ready, fonts-failed (system fallbacks).

Acceptance
- E2E: Given a fresh browser, when `/` loads, then the h1 is "Market Ops", the stamp reads "Data through May 2026", the mode switch has Overview checked, and the assistant shows exactly three suggestion chips with those labels.
- E2E: Given `/` has loaded, when Tab is pressed repeatedly, then focus visits wordmark link, breadcrumb, period control, mode switch, theme toggle, then the first KPI tile action, and every focused element shows a visible ring.
- C: Given no data yet, when the page renders, then skeletons show and no number is displayed.
- E2E: Given the OS prefers dark, when `/` loads with no stored theme, then `html[data-theme]` is absent and the computed background is `#161512`.

---

## Slice 2: Exec reads the portfolio

User and job: exec. "Am I on plan, what's wrong, is it getting worse, in 30 seconds."

Steps
1. Read four KPI tiles: Portfolio revenue $22.85M (+7.3% vs May 2025), Forecast attainment 100.4% (+$0.10M vs forecast), Growth +7.3% (YTD +6.1%), Markets needing attention 6 of 13 (4 at risk · 2 off track).
2. Read the choropleth coloured by attainment with the 13 markets filled and other countries neutral; a legend with the diverging scale and the 100% midpoint.
3. Read top movers: rising China, France, Canada; falling Germany, Spain, Italy, each with an "Ask why" button.
4. Hover or focus a tile for its provenance ("Derived · sum of series" or "Source · data.json").

States: ready; map loading (skeleton rectangle); map geometry failed to load (the map card shows a Notice-style inline message "Map unavailable. The market table below has the same data." and the table view is forced on).

Acceptance
- E2E: Given `/`, then the four tiles show exactly those headline values and delta texts, and no headline number is coloured.
- C: Given the Markets-needing-attention tile, then its delta uses the flat icon and `--ink-2`, not a status colour.
- E2E: Given the map, when the Germany path is focused, then its accessible name is "Germany, off track, 92.0% attainment"; when "View as table" is activated, then a table with 13 rows replaces the map and the button reads "View as chart".
- C: Given the map geometry fetch fails, then the fallback message renders and the table is shown.
- E2E: Given top movers, then the first rising row is "China +18.2%" and the first falling row is "Germany −9.7%" with a real minus sign.

---

## Slice 3: Drill down, share, back and forward

User and job: both personas. "Go from portfolio to Germany to Veltrix without losing context, and send someone exactly this view."

Steps
1. On the map, click Germany. Context becomes region eu, market de. Breadcrumbs read Portfolio › Europe › Germany; tiles, map highlight and top movers re-scope; the URL updates.
2. In the market view, pick Veltrix in the product selector. Context adds product veltrix; breadcrumbs add › Veltrix.
3. Change the period to March 2026. Every widget updates at once.
4. Copy the URL, open it in a new tab: the same view opens, in the same mode.
5. Press browser Back twice: period returns to May 2026, then product clears. Forward re-applies them.
6. Click the Portfolio breadcrumb: context resets to portfolio but period and mode are kept.

States: each navigation shows no spinner (data is local); widgets transition in 240 ms; selected row and map path carry the selected style.

Acceptance
- E2E: Given `/`, when the Germany map path is clicked, then the URL contains `region=eu&market=de`, the breadcrumb current item is "Germany", and the revenue tile reads "$1.68M".
- E2E: Given the Germany view, when Veltrix is selected, then the URL contains `product=veltrix` and the time series title reads "Germany · Veltrix".
- E2E: Given `/?region=eu&market=de&product=veltrix&period=2026-03&mode=analyst` opened directly, then breadcrumbs, period control, mode and all widgets reflect it, and the time series tooltip for March shows Actual $0.43M.
- E2E: Given two navigations, when Back is pressed twice, then the URL and breadcrumbs match the original state; when Forward is pressed, then they return.
- E2E: Given a market view in Analyst mode, when the Portfolio breadcrumb is activated, then `market` and `region` leave the URL and `mode=analyst` stays.
- U: Given Context, when `market` is set without `region`, then `region` is derived; when `product` is set without `market`, then the write is rejected.

---

## Slice 4: Analyst deep dive with coordinated views

User and job: analyst. "Locate the problem, explain it, compare peers, with exact numbers."

Steps
1. Switch the mode to Analyst. Density tightens; the layout shows the grid, time series, radar and heat map; the basis selector (Month, YTD, MAT) appears on the region and portfolio tiles.
2. In the Europe grid, read five rows with status, revenue, attainment, growth, share, sparkline. Hover the Status header for the inferred-rule tooltip. Hover Spain's attainment info icon.
3. Select Germany in the grid: the time series shows Germany with the March anomaly marker; the radar compares the Europe markets on attainment, growth and share (given); the heat map highlights Germany's row.
4. Click the heat map cell Germany × Mar 2026: period becomes March; the time series crosshair moves; the radar re-computes for March.
5. On any chart, press View as table; read the table; press View as chart.
6. Change the basis to YTD: the Europe tile attainment changes from 95.4% (month) to the YTD value and the caption says "YTD · Derived".

States: analyst density; selected row; hover tooltip; table view; reduced motion (no transitions).

Acceptance
- E2E: Given `/?mode=analyst&region=eu`, then the grid has five rows sorted by revenue, United Kingdom, Germany, France, Italy, Spain, with statuses At risk, Off track, At risk, At risk, Off track, and the Status header tooltip text contains "attainment is below about 92.5%".
- E2E: Given the grid, when the Germany row is activated with Enter, then the URL contains `market=de` and the time series shows one anomaly marker whose name is "Anomaly: March 2026 revenue fell 27 percent versus February".
- E2E: Given the heat map, when the cell "Germany, Mar 2026" is activated, then the URL contains `period=2026-03` and the time series tooltip (opened with keyboard) shows "Mar 2026".
- E2E: Given the heat map focused, when Arrow Right is pressed, then focus moves to the next period cell and its accessible name reads "Germany, Apr 2026, 92.2% of forecast".
- E2E: Given each of the four charts, when View as table is activated, then a table with the same data appears, the chart is hidden, and the toggle reads View as chart.
- C: Given the basis selector set to YTD, then the Europe attainment equals the selector-computed YTD value and the caption includes "YTD".
- C: Given the radar, then the three axes are labelled "Attainment", "Growth" and "Share (given)".

---

## Slice 5: Ask a normal question, stream, stop

User and job: both. "Ask why, watch the answer arrive, stop it if I have enough."

Steps
1. Click the chip "Why did Germany dip?" or type it and press Send.
2. The question echoes above a new answer card. Tokens appear one by one with the caret; the footer shows STREAMING… and Stop.
3. The `done` event arrives: caret disappears, three citation chips and the High confidence meter render, Show sources is available.
4. Alternative: press Stop mid-stream. The text stays, a "Stopped · partial answer" pill appears, no chips, no meter, footer shows PARTIAL · NO SOURCES ATTACHED and Retry.
5. Retry re-sends the same question.

States: idle, streaming, done, stopped. Send is disabled while streaming; the textarea keeps focus after Send.

Acceptance
- E2E: Given the assistant, when "Why did Germany dip?" is sent, then within 3 s the answer contains "steepest drop in March", exactly three chips exist with names "Go to Germany, Feb 2026", "Go to Germany, Mar 2026 (largest dip)", "Go to Veltrix in Germany, Mar 2026", and the meter's accessible name begins "High confidence".
- C: Given a mocked stream of three tokens, when rendered, then the text equals the concatenation exactly, including whitespace, and the caret is present until done.
- E2E: Given a streaming answer, when Stop is pressed before done, then the pill "Stopped · partial answer" is shown, no chip exists and no confidence meter exists.
- C: Given a stopped answer, when Retry is activated, then a new request is sent with the same question and the old card remains marked partial.
- C: Given reduced motion, then the caret does not animate.

---

## Slice 6: Follow a citation into the dashboard

User and job: analyst. "Verify the claim against the data."

Steps
1. In the Germany-dip answer, click the chip "Germany, Mar 2026 (largest dip)".
2. Context becomes region eu, market de, period 2026-03, cite 1. The dashboard scrolls or focuses the time series; the March point is highlighted and its tooltip opens; the grid row Germany is selected.
3. Click the chip "Veltrix in Germany, Mar 2026": product becomes veltrix as well.
4. Click an inline citation in the text: focus moves to its chip.
5. Press Back: the previous context returns and the chip loses its active style.

States: active chip (accent background inverted), landed highlight on the target point or row (accent ring for 2 s, then selected style), unresolved chip (dashed border, "Could not resolve" tooltip).

Acceptance
- E2E: Given the Germany-dip answer, when the March chip is activated, then the URL contains `market=de&period=2026-03&cite=1`, the time series tooltip shows "Mar 2026" and "Actual $1.21M", and the chip has `aria-pressed="true"`.
- E2E: Given the Veltrix chip is activated, then the URL contains `product=veltrix` and the time series title reads "Germany · Veltrix".
- C: Given a citation with an unknown market id, when rendered, then the chip shows the unresolved style and its description reads "Could not resolve this citation", and the sources table counts it.
- E2E: Given a chip was followed, when Back is pressed, then `cite` leaves the URL and no chip is pressed.

---

## Slice 7: The assistant disagrees with the data

User and job: analyst, and the reviewer looking for exactly this. "See where the AI and the source differ, and trust the source."

Steps
1. Send "Which markets are at risk this quarter and why?".
2. The answer names Germany, Italy and Brazil. The Germany chip carries the warning icon; hovering or focusing it shows "Assistant: At risk · Source (data.json): Off track".
3. Open Show sources: a table with four rows; the Germany row shows the warning and the caption explains that the dashboard follows data.json, where 4 markets are at risk and 2 are off track.
4. Follow the Germany chip: the dashboard shows Germany with status Off track.

States: differs chip, sources open, caption.

Acceptance
- E2E: Given the at-risk answer, then exactly one chip has the warning icon and its description reads "Assistant says at risk; source data says off track".
- E2E: Given Show sources is activated, then a table with four rows is visible, the first row's Assistant cell reads "At risk" in the warn colour with the icon, and the caption contains "4 markets are at risk and 2 are off track".
- U: Given claim "at risk" and source status "off_track", when compared, then the resolver flags a disagreement; given "at risk" and "at_risk", then it does not.

---

## Slice 8: Low confidence, abstain, error

User and job: both. "Know how far to trust an answer, and what to do when it cannot answer."

Steps
1. Send "What is driving the portfolio's forecast miss?": the Low meter with "Directional only, verify before acting"; three chips; sources collapsed.
2. Send "What will sales be next year?": the abstain card with the "Can't answer from this data" pill, the line "Data covers Jun 2024 to May 2026." and a suggested question button; no chips, no meter.
3. Send "force error": the Notice "Request failed" with Retry; no answer card.
4. Send an unmatched question ("hello"): the default low-confidence answer renders.

Acceptance
- E2E: Given the forecast-miss question, then the meter's name begins "Low confidence" and the meaning text reads "Directional only, verify before acting".
- E2E: Given the next-year question, then the pill "Can't answer from this data" is visible, the suggestion button reads `Try: "Which markets are at risk?"`, and activating it fills the input with that question.
- E2E: Given "force error", then a `role="alert"` element with title "Request failed" appears and Retry re-sends.
- C: Given a stream that errors after two tokens, then the two tokens remain visible marked partial and the Notice is shown beneath.

---

## Slice 9: Ask why from the dashboard

User and job: exec. "Get the explanation for the thing I just noticed."

Steps
1. In top movers, press "Ask why" on Germany: the assistant input is filled with "Why did Germany's revenue dip?" and focused; the user presses Send.
2. In the analyst grid, press "Ask why" on Spain: the input reads "Why is Spain off track?".

Acceptance
- E2E: Given top movers, when Germany's Ask why is activated, then the textarea value is "Why did Germany's revenue dip?" and has focus.
- C: Given a market with status at_risk, when Ask why is activated, then the prefilled text is "Why is {name} at risk?".

---

## Slice 10: Alert thresholds, save, rollback

User and job: analyst. "Watch it: set a rule, see which markets breach it, and trust the save."

Steps
1. Open Alert thresholds (Analyst mode card). Fields: Growth below %, Attainment below %, Scope (All markets, a region, a market). Defaults 0, 95, All markets.
2. Enter Attainment below 120: inline error "Enter a value between 0 and 100." and Save disabled until fixed.
3. Enter 95 with scope Europe and Save: the rule appears in the saved list immediately (optimistic) with "Saving…", then "Saved · just now"; the evaluation line reads "3 markets breach this rule: Germany, United Kingdom, Italy".
4. Tick "Simulate failure", change the threshold to 97 and Save: the row updates, then the Notice "Couldn't save" appears, the inputs and the row revert to 95, and Try again re-sends.
5. Delete a rule: a confirm dialog with a Danger button; confirming removes it.

States: valid, invalid, saving, saved, failed with rollback, empty list ("No alert rules yet. Add one to watch a threshold.").

Acceptance
- C: Given the form, when attainment is 120, then the input has `aria-invalid="true"`, the message is linked by `aria-describedby`, and Save is disabled.
- E2E: Given a valid rule, when Save is activated, then the list shows the rule within 100 ms with "Saving…", and within 2 s "Saved · just now" and the evaluation text "3 markets breach this rule".
- E2E: Given Simulate failure is on, when Save is activated with 97, then the rule briefly shows 97, then a `role="alert"` Notice titled "Couldn't save" appears and the rule shows 95 again.
- U: Given the zod schema, then growth accepts −100 to 100 and attainment 0 to 100 only, and scope must be portfolio, a region id or a market id.
- E2E: Given a saved rule, when Delete is activated and confirmed, then the rule is gone and the dialog's confirm button used the danger style.

---

## Slice 11: Theme, density and accessibility pass

User and job: everyone, and the reviewer's checklist.

Steps
1. Toggle the theme in the header; reload; the choice persists. Clear storage; the OS setting wins.
2. Switch modes; reload; the mode comes from the URL, not storage.
3. Enable reduced motion in the OS: no caret blink, no shimmer, no chart transitions.
4. Run the keyboard tour from the header to the last widget and through the assistant.

Acceptance
- E2E: Given the theme toggle is activated, then `html[data-theme="dark"]` is set and persists across reload; given storage is cleared and the OS prefers light, then the attribute is absent and the background is `#F1EDE4`.
- E2E: Given `prefers-reduced-motion: reduce`, then no element has a running animation (checked via `getAnimations()`).
- E2E: axe reports zero violations on `/`, `/?mode=analyst&region=eu&market=de`, and the assistant with an open answer, in both themes.
- E2E: Given 390 px, 768 px, 1024 px and 1440 px widths, then there is no horizontal page scroll and the assistant panel is below the dashboard under 1024 px.

---

## Slice 12: Stretch items in the main build

### 12a. Virtualised dense table
User and job: analyst. "Scan every fact."
Steps: in Analyst mode open "All facts"; a table of 1,560 rows (market, product, period, actual, forecast, prior year, units, attainment) virtualised to about 20 rendered rows; sort by any column; filter by the current Context; export CSV.
Acceptance
- C: Given 1,560 rows, when rendered at 600 px tall, then fewer than 40 row elements exist in the DOM and scrolling to the end shows the last period 2026-05 for Zephyra in Mexico.
- E2E: Given the table, when the Attainment header is activated twice, then rows are sorted descending and `aria-sort="descending"` is set.
- E2E: Given Context market=de, then the table shows 120 rows (5 products × 24 periods) and the caption reads "120 of 1,560 facts".

### 12b. Command palette
Steps: press Cmd-K or Ctrl-K; type "germ"; choose "Go to Germany"; also "Switch to Analyst", "Ask: Why did Germany dip?", "Toggle theme".
Acceptance
- E2E: Given any page, when Ctrl-K is pressed, then a dialog with a search input is focused; when "germ" is typed and Enter pressed, then the URL contains `market=de`.
- C: the palette lists every market, region and product, the two modes, the three example questions and the theme toggle.

### 12c. Storybook
Steps: stories for every design-system component in both themes and densities, with the a11y addon.
Acceptance: `npm run storybook` builds; each component has a story per state listed in design-system.md; the a11y addon reports zero violations per story.

---

## Slice 13: Parked, future flows (short)

- **Live mode:** a `Live · Paused` toggle in the header starts a 5 s tick that drifts the latest month's revenue and units for each market (up to ±2 % per tick, never more than ±8 % from the saved data); tiles, status, map, grid, series, radar and heat map update in place with the 240 ms transition and the stamp reads `LIVE · UPDATED hh:mm:ss`. The URL, selection, open rail and conversation do not move, `Paused` freezes the figures, and a reload returns to the saved data.
- **Context-aware assistant:** the assistant sends the current Context with the question so the answer defaults to the selected market and period; the question echo shows "About Germany · Mar 2026". Acceptance later: the request body contains the context and the fixture router can use it.

---

## Questions put to Flavius (answered above)

1. The brief lists the heat map as the fourth visual in our plan; slice 4 assumes it. Confirm the heat map over the scatter so slice 4 can be built as written.
2. Slice 10 proposes a delete with a confirm dialog, which is the only destructive action and the only use of the danger button. Keep it, or drop delete to keep the form smaller?
3. Slice 12a filters the facts table by Context. Should it instead ignore Context and always show all 1,560 rows with its own filters? My advice: follow Context, since it is the one navigation model.
