# Domain model: Market Operations console

Derived from the brief, `data.json`, `fixtures.json`, `CONTRACT.md` and `reference/chat-route.ts`, checked against the data itself, and grounded in how pharma commercial and BI products model the same ideas.

## 1. Why a domain model first

The console has two halves that must agree: a dashboard that renders facts and an assistant that makes claims about them. If "attainment", "at risk" and "latest period" mean one thing in the chart code and another in the chat code, the trust story collapses in the first demo. The model below fixes the words, the formulas and who is allowed to say what, so the design system, the URL state and the tests all hang off one vocabulary.

## 2. Ubiquitous language

| Term | Definition | Source |
|---|---|---|
| **Portfolio** | The whole dataset: every market and product. Totals are sums over the series. | derived |
| **Region** | A grouping of markets: North America, Europe, APAC, LATAM. Totals are sums. | `regions` |
| **Market** | A country where products are sold, with iso2 and iso3 codes for the map, a parent region, and precomputed KPIs for the latest period. The unit of status. | `markets` |
| **Product** | One of five brands: Veltrix, Nuvora, Orbispan, Calyx, Zephyra. No therapeutic area or launch date is given. | `products` |
| **Period** | A calendar month as `YYYY-MM`. The dataset holds 24, from 2024-06 to 2026-05. | `meta.periods` |
| **Latest period** | The most recent period with data, 2026-05. Every "current" number means this month. Shown as "Data through May 2026". | `meta.latestPeriod` |
| **Horizon** | The last period for which a forecast exists. It equals the latest period, so there is no forward forecast. Questions beyond it are abstained. | derived, fixtures |
| **Fact** | One series row: market × product × period with actual, forecast, units, prior year. 1,560 rows. | `series` |
| **Actual** | Revenue realised in the period, USD. | fact |
| **Forecast** | Revenue planned for the period, USD. One version only. | fact |
| **Prior year** | Actual for the same month one year earlier. Verified equal to the earlier row's actual for all 780 overlapping rows. | fact |
| **Units** | Volume sold. Price per unit is constant per product in this data, so units restate revenue. | fact |
| **Entity** | Anything a number can be about: portfolio, region, market, or market × product. The drill path walks down this list. | derived |
| **Scope** | An entity plus a period range. Every derived value is computed for a scope. | derived |
| **Attainment** | Actual divided by forecast for a scope, as a percentage. "Forecast attainment" in the brief. | formula |
| **Growth** | Actual divided by prior year, minus one, as a percentage. "Year on year" in the brief. | formula |
| **Variance** | Actual minus forecast, USD. The brief's "forecast miss" is a negative portfolio variance. | formula |
| **YTD** | Year to date: the scope's months from January of the latest period's year to the latest period. | formula |
| **MAT** | Moving annual total: the trailing 12 months ending at a period. Available from 2025-05 onwards (13 periods). | formula |
| **Share** | `sharePct`, a synthetic market-share figure per market. Not derivable from the data and does not sum within a region. Displayed, never computed. | `kpis` |
| **Status** | On track, at risk, or off track, per market, at the latest period. Given in `kpis`; the rule behind it is not documented (see 5.6). | `kpis` |
| **Anomaly** | A flagged event on a market at a period with a type and a note. One exists: Germany, 2026-03, dip, "Revenue fell 27% versus the prior month." | `kpis.anomalies` |
| **Top movers** | Markets ranked by growth at the latest period, best and worst. | derived |
| **Alert rule** | A user-defined threshold on a metric for a scope, e.g. growth below 0% for Europe. Saved through a mock endpoint. | app |
| **Question** | Text the user sends to the assistant. | contract |
| **Answer** | The assistant's response: streamed text, a kind, a confidence and citations. | contract |
| **Kind** | `normal`, `low_confidence`, `abstain`, `error`. Drives the answer's visual state. | contract |
| **Confidence** | `high`, `medium`, `low`. Categorical, never a number. | contract |
| **Citation** | A pointer from an answer to data: any of marketId, regionId, productId, period, plus a label. It resolves to an entity and a period. | contract |
| **Claim** | A statement in the answer text that a citation supports. In fixtures, the numbers and names next to a citation. | derived |
| **Provenance** | Where a displayed value comes from: Source, Derived, or Assistant. | app |
| **Disagreement** | A citation whose claim about an entity conflicts with the source value for the same entity and period. | app |
| **Context** | The shared navigation state: drill path, period, mode, selection. Lives in the URL. | app |
| **Mode** | Overview (exec) or Analyst. Changes density and which widgets show, never the data. | app |

## 3. Entities and relationships

```
Portfolio 1 ── * Region 1 ── * Market 1 ── * Fact * ── 1 Product
                                   │
                                   ├── 1 MarketKpis (latest period)
                                   │       └── * Anomaly
                                   └── * Citation (via marketId)
Region ── * Citation (via regionId)        Product ── * Citation (via productId)
Period ── * Fact                           Period ── * Citation

Question 1 ── 1 Answer 1 ── * Citation ── 1 ResolvedTarget { entity, period }
Answer ── 1 Kind, 1 Confidence, 1 StreamState

AlertRule { metric, comparator, threshold, scope } ── * Evaluation { entity, period, breached }
Context { drill: [regionId?, marketId?, productId?], period, mode, selection? }
```

Cardinalities verified: 4 regions, 13 markets (2 NA, 5 EU, 4 APAC, 2 LATAM), 5 products, 24 periods, 13 × 5 × 24 = 1,560 facts, no gaps.

## 4. Invariants (all checked against the data)

1. Every fact's `priorYear` equals the `actual` of the same market, product and month twelve periods earlier, where that month exists (780 of 780).
2. `kpis.revenue` equals the sum of the latest period's actuals for the market, within ±1 USD rounding (7 markets differ by exactly 1).
3. `kpis.growthPct` equals the latest-month growth formula to one decimal for all 13 markets.
4. `kpis.forecastAttainmentPct` is within 0.3 to 0.8 points of the latest-month formula and of YTD and quarter attainment, but matches none exactly. It is precomputed with an undocumented rounding or basis.
5. `sharePct` does not sum to 100 within a region (Europe sums to 95.6, North America to 37.1). It is external market share, not a share of our totals.
6. Price per unit is constant per product across all rows (Veltrix 167, Nuvora 361 to 362, Orbispan 278, Calyx 266 to 267, Zephyra 139 to 140).
7. All five products are mature and flat over the 24 months. There is no launch.
8. Status is consistent with a two-threshold rule (5.6) for all 13 markets; the exact cut-offs are not given.
9. The horizon equals the latest period: no forecast exists beyond 2026-05.
10. `meta.generatedAt` is 2026-06-09, nine days after the latest period: a plausible reporting lag, but no row is marked provisional.

## 5. Derived values and formulas

Write every formula once, in pure selectors over the fact table, and let every widget and the citation resolver call them. Aggregation is always a sum of actuals, forecasts and prior years over the scope first, then the ratio. Never average percentages.

| Value | Formula | Scope rules |
|---|---|---|
| 5.1 Total | Σ actual (likewise forecast, prior year, units) over the scope's facts | any entity, any period range |
| 5.2 Attainment | Σ actual ÷ Σ forecast × 100 | any; undefined if Σ forecast = 0 (never in this data) |
| 5.3 Growth | (Σ actual ÷ Σ prior year − 1) × 100 | any; prior year exists for every row |
| 5.4 Variance | Σ actual − Σ forecast | any; negative = miss |
| 5.5 Month-over-month change | actual(p) ÷ actual(p−1) − 1 | the anomaly's "fell 27%" is this (Germany: −27.2%) |
| 5.6 Status (inferred rule) | off track if growth < 0 or attainment < ~92.5; else at risk if attainment < 100; else on track | fits all 13 markets. Spain is off track only because growth is −4.6% at 104.5% attainment. The low cut-off sits between 92.0 (Germany, off) and 93.0 (Italy, at risk). |
| 5.7 YTD | scope totals over periods ≥ `YYYY-01` of the latest period's year | 2026-01 to 2026-05, five months |
| 5.8 MAT | scope totals over the 12 periods ending at p | periods from 2025-05 to 2026-05 |
| 5.9 Top movers | markets sorted by 5.3 at the latest period | top 3 and bottom 3 |
| 5.10 Markets needing attention | count of markets with status ≠ on track | 6 of 13 (4 at risk, 2 off track) |
| 5.11 Share | displayed from `kpis.sharePct` only | never derived; absent for regions and the portfolio |

Display rule: for the **latest-period market KPIs the dashboard shows the `kpis` value** (so the map, radar and status agree with what the assistant was written against), labelled Source. Everything else (regions, portfolio, YTD, MAT, any other period) is computed from series and labelled Derived. The README notes the small attainment gap between the two bases.

## 6. Provenance model

Three kinds of value can appear on screen, and the UI must always show which one it is:

| Provenance | What it is | Who may produce it | Visual |
|---|---|---|---|
| **Source** | A number or status read directly from `data.json` | the data layer | white card, caption "Source · data.json" |
| **Derived** | A number computed by a documented formula from source facts | selectors in `domain/` | white card, caption "Derived · sum of series" |
| **Assistant** | A claim streamed from the mock model, with citations | the chat route | lilac card, "Assistant" eyebrow, confidence, chips |

Rules:
1. The assistant never produces a Source or Derived value. Numbers in its text are claims, each tied to a citation chip.
2. A citation resolves to `{ entity, period }`. If it names a product and a market it resolves to the market × product scope; a region alone resolves to the region; a missing period defaults to the latest period and is shown as such.
3. Resolution looks up the Source or Derived value for that scope. If the claim's status word conflicts with the source status, the chip is marked "differs from source" and the sources table shows both. The dashboard always wins.
4. A citation that cannot resolve (unknown id) renders as broken, is never hidden, and lowers the displayed trust by showing the broken count in the sources table.
5. Partial answers (stream stopped or failed mid-way) carry no citations and no confidence, because the `done` event never arrived.

Known disagreements in the shipped data: the at-risk fixture names Germany, Italy and Brazil as at risk, while `kpis` has Germany and Spain off track and the UK, France, Italy and Brazil at risk. CONTRACT.md's own narrative repeats the fixture's version. The console treats `kpis` as source and surfaces the gap.

## 7. Assistant sub-model

**Answer lifecycle (state machine):**

`idle → streaming → (done | stopped | failed)`
- `streaming`: tokens are appended; the caret shows; Stop is available.
- `done`: the `done` event arrived; kind, confidence and citations are set; chips render; sources resolve.
- `stopped`: the user aborted; text is kept and marked partial; no citations, no confidence.
- `failed`: an `error` event arrived (or the fetch failed); the Notice renders; text so far is discarded unless tokens had arrived, in which case it is shown as partial.

**Kind to presentation:** `normal` renders fully; `low_confidence` renders fully with the Low meter and the "directional" meaning line; `abstain` renders the text, no chips, the "Can't answer from this data" pill and a suggested question; `error` goes to `failed`.

**Fixture matching is deterministic**: first keyword substring match in array order, else the default low-confidence answer. The three cold-open example questions map to `at-risk`, `germany-dip` and `next-year`.

## 8. Alert sub-model

`AlertRule { id, metric: "growth" | "attainment", comparator: "below", threshold: number, scope: "portfolio" | regionId | marketId, createdAt }`

- Validation: growth threshold −100 to 100; attainment threshold 0 to 100; scope must resolve.
- Evaluation is a pure function over the latest period's derived values for every market in scope, returning the breaching markets. With the rule "attainment below 95", Europe returns Germany, the UK and Italy.
- Persistence is a mock Route Handler with an in-memory list and a `?fail=1` switch. The client applies the rule optimistically, shows Saving, then Saved or a rollback Notice.
- Alerts are evaluated, not pushed: the list shows "3 markets breach this rule" and nothing flashes.

## 9. Context (navigation) sub-model

`Context { region?: regionId, market?: marketId, product?: productId, period: Period, mode: "executive" | "analyst", metric: "attainment" | "revenue" | "growth", cite?: citationIndex }`

- Invariants: market implies its region; product implies a market; period is within `meta.periods`; defaults are portfolio, latest period, the signed-in role's view (executive or analyst), attainment.
- Every widget reads Context and writes it through one API, so a map click, a breadcrumb, a heat-map cell and a citation chip are the same operation.
- Context is serialised to the URL. Mode is part of it so a shared link opens at the sender's depth.

## 10. Industry grounding: what to adopt, what to defer

| Concept in the industry | Where it appears | Our data supports it? | Decision |
|---|---|---|---|
| Hierarchy nation → region → territory; brand → SKU | IQVIA PharmaReport, Veeva Compass levels, Salesforce product hierarchy | Yes: region → market → product | Adopt as the drill path and the analyst grid |
| MTD / YTD / MAT vs plan | Pharma finance reporting | YTD and MAT yes; MTD no (monthly grain) | Adopt YTD and MAT as derived values; say "month" not "MTD" |
| Prior-period comparison on every metric | IQVIA Brand Analytics, Tableau Pulse cards | Yes (prior year, previous month) | Adopt: every tile shows a delta with its comparison label |
| Data recency and coverage | Veeva "brand coverage", Setproduct "last updated" | Latest period yes; provisional flag no | Adopt the stamp; defer the provisional hatch |
| Multiple forecast versions (plan vs latest estimate) | Pharma FP&A practice | No, one forecast | Defer; README |
| Leading indicators: TRx, NRx, rejections, abandonment | IQVIA libraries, Veeva Compass | No | Defer; README names them as what would explain a miss |
| Market share | IQVIA, Veeva | Given as a synthetic number only | Display only; never compute |
| Launch vs mature segmentation | Pharma commercial practice | No launches in data | Defer; README |
| Detected insights with suggested questions | Tableau Pulse | Anomalies array gives one | Adopt: anomalies become annotations and "Ask why" prompts |
| Verifiable answers: show the query, double check | ThoughtSpot Spotter | Citations give entity and period | Adopt: citation chips plus the sources table are our "query tokens" |
| Semantic layer as the trust foundation | ThoughtSpot, Hex at Ramp | Typed contract plus selectors | Adopt the framing in the README |
| Alerts pushed to the field | Axtria, Salesforce | Out of scope | Defer; in-app evaluated rules only |

## 11. Modelling rules

1. `domain/` holds the model as code: types from one zod schema for `data.json` and the SSE events, pure selectors for 5.1 to 5.10, a citation resolver implementing section 6, and the alert evaluator. They are unit-tested against the real numbers, independent of the UI; they are the "tests that hold up" the brief asks for.
2. Treat latest-period market KPIs as Source and everything else as Derived, label both, and note the attainment basis gap in the README.
3. Infer the status rule only as an explanation in a tooltip and the README ("consistent with: off track when growth is negative or attainment is below about 92.5%; at risk below 100%"). Never recompute a market's status from the saved data; the data gives it. A region or the portfolio, which the data does not rate, gets the same rule applied to its figures (section 12, item 2).
4. Keep units in the grid but do not build a price or volume story on them.
5. Make Context the single navigation primitive and derive breadcrumbs, chips and widget inputs from it.

## 12. Settled modelling decisions

1. Attainment basis: the latest month by default everywhere; Analyst mode offers a labelled basis selector with Month, YTD and MAT for regions and the portfolio. MAT needs twelve months of data and falls back to Month before that.
2. Region and portfolio status: `data.json` gives status only per market, so the console derives one for a region or the portfolio by applying the published rule (5.6) to its figures (`statusForDerived` in `src/domain/status.ts`). It drives the verdict sentence, the region groups in the status strip and the region bars, while the Needs attention tile keeps the counts of markets by status ("4 at risk · 2 off track" for the portfolio). A market's status is always the given one, except in live mode, where the simulated figures are re-rated with the same rule and the captions say they are simulated.
3. Inferred status rule: shown as a one-line tooltip on the Status rule control and explained in the README. A market's given status is never recomputed from the saved data.
4. Alert scope: portfolio, region or market. Not product, since status is a market concept.
5. Share: kept as a radar axis, labelled "Share (given)", never derived, although it is synthetic.
