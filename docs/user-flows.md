# User flows

Who uses the console, what each of them is trying to get done, and the flows that serve those jobs. Each flow lists its steps, the states it can be in, and what is checked; the end-to-end checks live in `tests/e2e/`, one spec per feature, named under each flow. Vocabulary follows domain-model.md; visuals follow design-system.md.

## Users and jobs

- **Executive** (persona Dana Whitfield). Reads the portfolio, rarely drills far, has seconds rather than minutes. Job: "Am I on plan, what's wrong, is it getting worse, in 30 seconds." Needs a verdict in words, a few headline numbers that are never coloured for effect, and a way to ask why without learning the tool. Opens on the Executive view; alert rules are read-only.
- **Analyst** (persona Sam Okafor). Works the data. Job: "Locate the problem, explain it, compare peers, with exact numbers." Needs dense tables, coordinated charts, every number traceable to its source, and alerts that watch thresholds. Opens on the Analyst view and manages alert rules.
- **Reviewer**, or any first visit. Job: "Understand what this is and what it can do in under a minute, with no demo." Needs suggested questions that show off the assistant, and states that explain themselves.

Both personas also need to verify the assistant against the data, and to send a colleague exactly the view they are looking at.

Conventions
- "Context" means the URL state `{region, market, product, period, mode, metric, basis, cite, facts}`; defaults are portfolio, the latest period (May 2026), the signed-in role's view, attainment, month.
- Sample values are the ones in domain-model.md section 5.
- Every screen passes axe with zero violations, and renders in light and dark, Executive and Analyst.

---

## 1. Cold open

User and job: the reviewer, or any first visit.

Steps
1. Open `/`. A first visit is signed in as the Executive and redirected to `/?mode=executive`.
2. See the header: the wordmark "Market Ops", the drill path at Portfolio, Live and Paused, the stamp "Data through May 2026", the mode switch on Executive, the theme toggle and the account button for Dana Whitfield.
3. See the Overview and the assistant panel open beside it, with the composer first, a one-line insight about the portfolio ("Germany is furthest from plan: …") and three suggested questions: "Which markets are at risk?", "Why did Germany dip?", "Compare APAC and Europe".

States: loading (a skeleton with the dashboard's shape), ready, fonts failed (system fallbacks). Below 1024 px the assistant is a bottom bar that opens a sheet.

Checks
- The h1 is "Market Ops", the stamp reads "Data through May 2026", Executive is checked, and the three suggestions are visible.
- Tab from the skip link visits the controls in a fixed order with a visible ring on each (the order is generated into accessibility.md).
- With the OS set to dark and nothing stored, `html[data-theme]` is absent and the dark tokens apply.

Tested in `smoke.spec.ts`, `cold-open.spec.ts`, `overview.spec.ts`.

---

## 2. The executive reads the portfolio

User and job: the executive. "Am I on plan, what's wrong, is it getting worse."

Steps
1. Read the verdict, the first heading: "Portfolio is on track at 100.4% of forecast, up 7.3% on last year. Six markets need attention."
2. Scan the status strip: all 13 markets as chips grouped by region, each region with its own health.
3. Read four KPI tiles: Portfolio revenue $22.85M (+7.3% vs May 2025), Forecast attainment 100.4% (+$0.10M vs forecast), Growth +7.3% (YTD +6.1% vs 2025), Needs attention 6 of 13 (4 at risk · 2 off track). The revenue tile carries a 24-month trend.
4. Read Needs attention: the six flagged markets ranked (Germany and Spain off track; Italy, the United Kingdom, Brazil and France at risk), each with Ask why, and top movers beneath, rising led by China and falling led by Germany.
5. Read the choropleth coloured by attainment, the 13 markets filled and other countries neutral, with a diverging legend around 100%; and the region bars beside it.
6. Hover or focus a figure for its provenance ("Source · data.json" or "Derived · sum of series").

States: ready; map loading (a skeleton of the same height); map geometry failed ("Map unavailable. The market table below has the same data.", with the table forced on).

Checks
- The four tiles show exactly those headlines and deltas, and no headline is coloured by direction; the attention tile's delta uses the flat icon.
- The Germany path's accessible name is "Germany, off track, 92.0% attainment"; Enter drills in; View as table swaps the map for a 13-row table and the toggle reads View as chart.
- A failed geometry request shows the fallback and the table.
- At `?region=eu` the verdict and strip scope to Europe.

Tested in `kpis-and-map.spec.ts`, `overview.spec.ts`, `breadcrumb-and-legend.spec.ts`.

---

## 3. Drill down, share, back and forward

User and job: both personas. "Go from portfolio to Germany to Veltrix without losing context, and send someone exactly this view."

Steps
1. On the map (or the status strip, region bars or attention list), click Germany. The Context becomes region eu, market de. The drill path reads Portfolio › Europe › Germany; the verdict, tiles and map re-scope; the URL updates.
2. Pick Veltrix in the product selector. The Context adds product veltrix and the document title names it.
3. Change the period to March 2026. Every widget updates at once.
4. Copy the URL and open it in a new tab: the same view opens, in the same mode.
5. Press Back twice: the product clears, then the market. Forward re-applies them.
6. Activate the Portfolio crumb: the drill clears, the period and mode are kept.

States: no spinner (the data is local); the dashboard column dims while a navigation is in flight; widgets transition in 240 ms; a keyboard drill moves focus to the new page heading, a mouse drill leaves it alone.

Checks
- Clicking Germany puts `region=eu&market=de` in the URL, the current crumb is "Germany" and the revenue tile reads "$1.68M".
- `/?region=eu&market=de&product=veltrix&period=2026-03&mode=analyst` opened directly renders every part of that state, and the title is "Germany · Veltrix · March 2026 · Market Ops".
- The Portfolio crumb's href keeps period and mode and drops region and market.
- Setting `market` without `region` derives the region; setting `product` without `market` is rejected (unit test).

Tested in `drill-and-history.spec.ts`, `drill-feedback.spec.ts`, `breadcrumb-and-legend.spec.ts`.

---

## 4. The analyst works the data

User and job: the analyst. "Locate the problem, explain it, compare peers, with exact numbers."

Steps
1. Switch to Analyst. Density tightens and the page becomes one ruled sheet under a sticky toolbar (period, product, basis Month, YTD or MAT, the status rule): KPI strip, the Markets grid, the map, the revenue time series, Compare (radar), the heat map, and Alerts folded at the end. The assistant starts collapsed to a rail, so the dashboard is wide.
2. In the Europe grid, read five rows sorted by revenue with status, revenue, forecast, prior year, attainment, growth, share, units and a sparkline, above a total row. Hover the Status rule for the inferred rule; focus Spain's note to see why it is off track despite 104.5% attainment.
3. Select Germany: the grid shows Germany's products, and the time series shows Germany with the March anomaly marker.
4. Activate the heat map cell Germany × Mar 2026: market and period change and the other views follow.
5. On any chart, press View as table, read it, press View as chart.
6. Change the basis to YTD: the Europe attainment tile changes from 95.4% to 95.1%. Before twelve months of data, MAT is disabled and says why.

States: Analyst density; selected row; hover tooltip; table view; reduced motion (no transitions).

Checks
- `/?mode=analyst&region=eu` lists the United Kingdom, Germany, France, Italy and Spain, with statuses At risk, Off track, At risk, At risk, Off track; the status tooltip contains "attainment is below about 92.5%".
- Enter on the Germany row puts `market=de` in the URL and the time series has one anomaly marker.
- Arrow Right on a heat map cell moves to the next month; heat map rows follow the grid's order.
- The radar has five axes: Attainment, Growth YoY, Share (given), Month on month, Units YoY.

Tested in `analyst-view.spec.ts`, `analyst-ledger.spec.ts`, `assistant-rail.spec.ts`.

---

## 5. Ask a question, watch it stream, stop it

User and job: both. "Ask why, watch the answer arrive, stop it if I have enough."

Steps
1. Click "Why did Germany dip?" or type it and press Enter.
2. The question is echoed with where it was asked ("You asked, about Portfolio · May 2026:"). Tokens appear with a caret; the card header shows STREAMING… beside the AI label, with Stop.
3. The `done` event arrives: the caret goes, three citation chips and the High confidence meter render, and Show sources is available.
4. Alternatively, press Stop mid-stream. The text stays with a "Stopped · partial answer" pill, no chips and no meter; the header shows "Partial · no sources" and Stop becomes Retry; the line where the chips would be says "Stopped before sources arrived. Retry to get citations." A stream that fails after some text reads "Failed · partial answer" and "Request failed before sources arrived. Retry to get citations."
5. Retry asks the same question again as a new answer; the old one stays marked partial.

States: idle, streaming, done, stopped, failed. The composer keeps focus after sending; a live region announces "Answer complete" or "Answer stopped, no sources". A collapsed panel keeps streaming and badges the finished answer.

Checks
- The Germany answer contains "steepest drop in March" and exactly three chips: "Germany, Feb 2026", "Germany, Mar 2026 (largest dip)", "Veltrix in Germany, Mar 2026"; the meter's name begins "High confidence".
- Stop leaves the partial text, no chips and no meter, and focus on Retry.
- While streaming, the 95th percentile frame gap stays under 50 ms and none passes 100 ms.

Tested in `assistant-stream.spec.ts`, `answer-card.spec.ts`, `perf/streaming-jank.spec.ts`.

---

## 6. Follow a citation into the dashboard

User and job: the analyst. "Verify the claim against the data."

Steps
1. In the Germany-dip answer, activate the chip "Germany, Mar 2026 (largest dip)".
2. The Context becomes region eu, market de, period 2026-03, mode analyst, cite 1. The dashboard scrolls to the time series, the March point is highlighted with its tooltip open, and the target rings for two seconds.
3. Activate "Veltrix in Germany, Mar 2026": product becomes veltrix, the Veltrix row is selected and the chart is titled Germany · Veltrix.
4. Activate an inline citation in the text: focus moves to its chip, without navigating.
5. Press Back: the previous Context returns and no chip is pressed.

States: pressed chip; landed target (ring, then the selected style); unresolved chip (dashed border, cannot be followed).

Checks
- The March chip puts `market=de`, `period=2026-03`, `mode=analyst` and `cite=1` in the URL; the tooltip shows "Mar 2026" and "Actual $1.21M"; the chip has `aria-pressed="true"`.
- A citation with an unknown market renders unresolved and the sources table counts it.

Tested in `citations.spec.ts`.

---

## 7. The assistant disagrees with the data

User and job: the analyst, and the reviewer looking for exactly this. "See where the AI and the source differ, and trust the source."

Steps
1. Ask "Which markets are at risk?".
2. The answer names Germany as at risk. A note leads the chip area: "Differs from source: at risk here, off track in data.json". The Germany chip carries the warning icon and its description reads "Assistant says at risk; source data says off track".
3. Show sources is open by default for this answer: a table with four rows, the Germany row flagged, with the assistant's wording in the warning colour.
4. Follow the Germany chip: the dashboard shows Germany as Off track.

States: differs note and chip; sources open; caption. The sources table stays closed when nothing disagrees.

Checks
- Exactly one chip has the warning icon.
- The sources table has four rows; the flagged row's Assistant cell reads "At risk" in `--warn-text`.
- A claim of "at risk" against source status `off_track` is flagged; against `at_risk` it is not (unit test).

Tested in `differs-from-source.spec.ts`, `answer-card.spec.ts`.

---

## 8. Low confidence, abstain, error

User and job: both. "Know how far to trust an answer, and what to do when it cannot answer."

Steps
1. Ask "What is driving the portfolio's forecast miss?": the Low meter, "directional only, verify before acting", and three chips.
2. Ask "What will sales be next year?": the "Can't answer from this data" pill, the line "Data covers Jun 2024 to May 2026." and a suggested question; no chips, no meter. The suggestion fills the composer without sending.
3. Ask "force error": a "Request failed" notice ("The assistant could not answer. Nothing was changed.") with Retry; no answer text.
4. Ask something unmatched ("hello"): the default low-confidence answer.

Checks
- The meter's name is "Low confidence: directional only, verify before acting".
- The suggestion reads `Try: "Which markets are at risk?"` and fills the composer.
- "force error" shows a `role="alert"` titled "Request failed", and Retry asks again.
- A stream that errors after two tokens keeps them, marked partial, with the notice beneath.

Tested in `answer-kinds.spec.ts`.

---

## 9. Ask why from the dashboard

User and job: the executive first, and the analyst. "Get the explanation for the thing I just noticed."

Steps
1. In Needs attention, press Ask why on Germany: the assistant opens, sends "Why did Germany's revenue dip?" about Germany · May 2026, and keeps focus in the composer.
2. In the Analyst grid, Ask why on Spain sends "Why is Spain off track?".
3. On a heat map cell, Shift+Enter fills the composer with "Why did Germany's revenue dip in Mar 2026?" without sending; Enter sends it, labelled with where it was filled from.
4. The question carries the view it was asked from, so the answer is about that scope: at Europe, "Which markets are at risk?" cites only European markets; in Germany in March, "Why did revenue dip?" is answered from that month's numbers.

Checks
- Below 1024 px, Ask why opens the assistant sheet with the composer focused.
- A market with a dip asks why it dipped; otherwise the question names its status ("Why is {name} at risk?").

Tested in `ask-why.spec.ts`, `scoped-answers.spec.ts`.

---

## 10. Alert thresholds: save, roll back, delete

User and job: the analyst. "Watch it: set a rule, see which markets breach it, and trust the save."

Steps
1. Open Alerts in the Analyst view (folded by default; it stays open for the tab). Fields: Growth below %, Attainment below %, Scope (All markets, a region or a market). Defaults 0, 95, All markets.
2. Enter Attainment below 120: the inline error "Enter a value between 0 and 100." and Save disabled until fixed.
3. Choose Europe and Save: the rules appear at once with "Saving…", then "Saved · just now", each with its evaluation: "3 markets breach this rule: Germany, Italy, United Kingdom".
4. Tick "Demo · simulate a failed save", change attainment to 97 and Save: the row shows 97, then the "Couldn't save" notice takes focus, the inputs and the row go back to 95, and Try again re-sends.
5. Delete a rule: a confirm dialog with Cancel focused and a danger Delete; confirming removes it.
6. Reload: saved rules are still there. They live in this browser.

States: valid, invalid, saving, saved, failed with rollback, empty list ("No alert rules yet. Add one to watch a threshold."), read-only. Signed in as the Executive, the rules are visible but the fields are disabled, with "Read-only for Executives. Switch to Analyst to edit rules."; the API answers `403 read_only_role`.

Checks
- At 120 the input has `aria-invalid="true"`, the message is linked by `aria-describedby`, and Save is disabled.
- The optimistic row is visible within 100 ms and "Saved · just now" within 2 s.
- The schema accepts growth −100 to 100 and attainment 0 to 100 only, and a scope of portfolio, a region or a market (unit test).

Tested in `alerts.spec.ts`, `roles.spec.ts`.

---

## 11. Theme, density and accessibility

User and job: everyone, and the reviewer's checklist.

Steps
1. Toggle the theme; reload; the choice persists and wins over the OS. With nothing stored, the OS setting applies.
2. Switch modes; reload; the mode comes from the URL, not storage. Density follows the mode.
3. Turn on reduced motion in the OS, or with the console's own Reduce motion command: no caret blink, no shimmer, no transitions.
4. Tab from the header through the dashboard and into the assistant.

Checks
- Charts and chips re-colour on toggle without a reload.
- Under reduced motion, nothing is left animating after a drill or after opening and closing the palette.
- axe reports zero violations on the Overview, the Overview with an open answer, and the Analyst view, in both themes; borders survive forced colours.
- At phone, tablet and desktop widths there is no horizontal page scroll, touch targets are at least 44 px, and under 1024 px the assistant is a bottom bar that opens a sheet.

Tested in `accessibility.spec.ts`, `mobile.spec.ts`, `forced-colors.spec.ts`, `tooltip-containment.spec.ts`, `perf/motion-budget.spec.ts`.

---

## 12. Scan every fact

User and job: the analyst. "Scan every fact."

Steps: in the Analyst view, open All facts (`facts=1`); a table of every fact in the current Context (market, product, period, actual, forecast, prior year, units, attainment), virtualised so only the rows near the viewport are in the DOM; sort by any column; copy the rows as CSV.

Checks
- At `market=de` the table is "120 of 1,560 facts" (5 products × 24 periods) and has fewer than 40 rendered rows.
- At portfolio it is "1,560 of 1,560 facts"; activating Attainment twice sorts descending with `aria-sort="descending"`.

Tested in `facts-table.spec.ts`.

---

## 13. Jump anywhere from the keyboard

User and job: both, and the keyboard-first reviewer.

Steps: press Ctrl-K or Cmd-K (or the palette button by the assistant); type "germ"; choose "Go to Germany". The palette also offers regions, products, the two views, the example questions, Toggle theme, Reduce motion, and "Ask" for any unmatched query.

Checks
- Ctrl-K focuses the palette input; "germ" and Enter put `market=de` in the URL and focus the verdict.
- Escape returns focus to whatever opened the palette.

Tested in `command-palette.spec.ts`.

---

## 14. Watch the figures move

User and job: the executive, and the reviewer. "See the console as it would look on live data."

Steps: press Live in the header. Every 5 s the latest month's revenue and units drift for each market (at most ±2% per tick and ±8% from the saved data); tiles, status, map, grid, series, radar and heat map update in place, the stamp reads "Live · updated hh:mm:ss" and captions read "Derived · live". The URL, the selection, the open panel and the conversation do not move. Paused freezes the figures; a reload returns to the saved data. Answers keep using the saved data, and say so.

Checks
- Live changes Germany's revenue tile and leaves the URL alone; Paused freezes it; a hidden tab does not tick.
- Under reduced motion the live dot is static and no mark transitions.

Tested in `live-data.spec.ts`.

---

## 15. Switch persona

User and job: the reviewer, trying both views. "See what each role gets."

Steps: open the account menu and switch to Analyst: the Analyst view opens with editable alerts. Sign out to reach the sign-in screen and pick a persona card to return to its view. A shared link with a `mode` always shows that mode, whoever opens it.

Tested in `roles.spec.ts`.
