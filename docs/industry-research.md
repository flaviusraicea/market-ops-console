# Industry research: what popular pharma commercial analytics and modern analytics products do

Status: research notes, 2026-11-02. The aspects in section 4 informed the design; Flavius decided which to adopt.

## 2. What the pharma products actually ship

| Product | What it is | What the public material says about the UI |
|---|---|---|
| IQVIA PharmaReport Sales Dashboard | Sales performance module | Analyses sales "over time, by product and region"; KPIs are management-defined (sales, targets, activity); drill into results per KPI; geography by region and sector/brick; flags regions or reps "that need attention"; presentation and coaching features. No layout described. |
| IQVIA Brand Analytics | Self-service patient and market data tool | Client-customisable dashboards, "dynamic visualizations", refresh "with changes shown against the prior period", export to Excel and PowerPoint. No forecast vs actual, no alerts described. |
| IQVIA Commercial Analytics Libraries | 300+ prebuilt analytics | "Competitive KPI tracking" against forecast assumptions (TRx growth, rejection rates, abandonment); automated monthly refresh; export. No anomaly or alert features described. |
| Veeva Compass | Data products (Patient, Prescriber, National) | Data at HCP, HCO, ZIP, state and national levels; a "brand coverage" metric stating what share of projections rests on actuals; query builder, scheduled queries, file export. It is a data product more than a dashboard. |
| Salesforce Life Sciences Cloud | CRM plus Agentforce | Dashboard combines an agent prompt box, a daily audio summary, engagement analytics and suggested insights; product hierarchy with agent suggestions beside it; mobile alerts for shortfalls. |
| ZS ZAIDYN Insights & Analytics | Reporting layer | 35+ templates, "function and role-specific dashboards", "AI-powered insights", role-based permissions. No concrete screens described. |
| Axtria SalesIQ | Sales planning and ops | "Role-specific workflows", responsive UI, field reporting with mobile visualisations, proactive "business suggestions" and sales triggers delivered as next-best-action. |

Takeaway: the pharma incumbents converge on a few things: monthly cadence, hierarchy (nation to region to territory, brand to product), comparison to prior period and to plan, role-specific views, export, and lately an AI assistant beside the data. None of the public material shows the trust mechanics the brief asks for. That is the gap our console can fill visibly.

## 3. What the modern analytics and product UIs do

| Product | Pattern worth noting |
|---|---|
| Tableau Pulse | A metric card with current value, change vs prior period and the applied filters; an overview line chart; a breakdown tab by dimension (Region by default); suggested questions per detected insight; plain-language Q&A that returns "key insights, visualizations, source references, and suggested follow-ups"; follow and digest. |
| ThoughtSpot Spotter | Every answer shows the search tokens it ran, so a user can "verify the query and result"; tokens are editable; a "double check" action; table and chart toggle; feedback that admins review. Its CEO's line, "most AI agents are confident idiots", is the framing: the answer must be verifiable, not just confident. |
| Hex at Ramp | Trust came from a documented semantic layer giving the agent context, not from the chat UI. Lesson: the assistant is only as trustworthy as the data contract behind it. |
| Linear | 13px body, 4px grid, 32 to 36px rows, one accent used only for focus and primary action, four text tiers, surfaces stepped by lightness not shadows, Cmd-K as the fallback for every action, shortcut hints inline, nothing hover-only. |
| Stripe dashboard | Design-system-first, fully themeable tokens, colour tokens generated against the WCAG contrast algorithm, dark mode designed rather than inverted, complex tables kept usable on small screens. |
| Setproduct dashboard rules | One screen answers one question, the largest element answers it; KPI tile = number, delta, comparison label, delta coloured by direction only; round aggressively except in tables; hue reserved for status, 3 to 5 series and one accent; filters as removable chips reflected in the URL; always show "last updated". |
| Lazarev AI dashboard principles | "Trust is a design system": provenance visible by default, confidence as a readable categorical signal, explain by exception with the full trace one click away, explicit fallback states instead of blank widgets, avoid red/green adjacency, charts fall back to a table. |
| Aufait AI patterns | Explainable overlays naming inputs, confidence and data sources; narrative beside charts, never replacing them; progressive disclosure canvas. |

## 4. Core design aspects for our console

Each aspect: what the industry does, which products show it, how it maps to our approved steps, our data, and Direction A. "Flag" marks anything that would change or contradict what has been approved.

### 4.1 Hierarchy is the product
- **Industry:** every pharma tool is organised as a hierarchy (nation, region, territory; brand, product). IQVIA PharmaReport, Veeva Compass levels, Salesforce product hierarchy.
- **Maps to:** step 2 (analyst job 1), step 4 (breadcrumbs in the header), the pharma-research addendum (hierarchical grid as the analyst centrepiece).
- **Our data:** region, market, product, period. Fully supported.
- **Direction A:** the breadcrumb and grid are the analyst's spine. No change.

### 4.2 Compare to plan and to prior period, on every number
- **Industry:** IQVIA Brand Analytics shows changes vs the prior period; PharmaReport compares to targets; Pulse cards carry value plus change plus comparison label.
- **Maps to:** step 2 (exec job 1 and 3), step 4 (KPI tiles with deltas).
- **Our data:** actual, forecast, priorYear per row. Supported. Attainment and YoY growth are derivable everywhere, including region and portfolio totals we sum ourselves.
- **Direction A:** adopt the Pulse/Setproduct tile anatomy exactly: headline number uncoloured, delta coloured by direction with an icon, comparison label ("vs forecast", "vs May 2025"). No change.

### 4.3 Monthly cadence and a visible "data through" stamp
- **Industry:** IQVIA libraries refresh monthly; Setproduct rule 8 says always show last updated; Veeva's "brand coverage" metric tells users how much of a projection rests on actuals.
- **Maps to:** step 3 (freshness), the pharma addendum (stamp, no provisional hatch).
- **Our data:** latestPeriod is 2026-05 and is not flagged provisional.
- **Direction A:** header stamp "Data through May 2026". Veeva's coverage idea is the honest version of the "blind spot" hatch: it is a label about certainty, not fake data. README notes it as the next step. No change.

### 4.4 Role-specific views
- **Industry:** ZAIDYN, Axtria and IQVIA all sell "role-specific" dashboards and workflows.
- **Maps to:** step 1 (exec and analyst), step 4 (two depths, one app).
- **Direction A:** mode in the URL, one token set at two density scales. The industry does this as separate dashboards per role; ours is a stronger version because the link carries the depth. No change.

### 4.5 The assistant sits beside the data and points at it
- **Industry:** Salesforce puts the agent prompt on the dashboard; Pulse returns answers with "source references"; Aufait says narrative sits beside charts, never replacing them.
- **Maps to:** step 3 (source vs AI surfaces, citation chips that navigate), step 4 (dashboard main column, assistant panel).
- **Direction A:** confirmed. The lilac AI surface with citation chips is our version of Pulse's source references. No change.

### 4.6 Verifiable answers, not confident ones
- **Industry:** Spotter shows the tokens it ran and offers "double check" and editable queries; Ramp's lesson is that trust comes from the semantic layer.
- **Maps to:** step 3 (chips land on the exact view; "differs from source" marker; no fake percentages).
- **Our data:** fixtures give citations with marketId, productId, period and label. That is our "query tokens".
- **Direction A:** render each citation chip as the Spotter-style token: entity plus period, clickable, resolvable. Add one small thing: a "Show sources" expander on every answer listing all chips as a table, which is the analyst's "double check". Small addition, consistent with step 3.

### 4.7 Confidence as a categorical, readable signal
- **Industry:** Lazarev: categorical bands or a short qualifier, never a bare number; Aufait shows confidence with data sources in an overlay.
- **Maps to:** step 3 (three levels, word plus icon plus one-line meaning).
- **Direction A:** confirmed. No change.

### 4.8 Explicit fallback and abstain states
- **Industry:** Lazarev principle 6: replace blank widgets and spinners with a state that says what happened and offers a next step; Elva proposes a starting point.
- **Maps to:** step 3 (abstain is first-class with a reason and a suggested rephrase; partial streams marked).
- **Direction A:** confirmed. Add the "suggested next question" to the abstain state, which the fixtures already hint at ("If forward forecast data is loaded, I can summarise it"). No change.

### 4.9 Suggested questions and explain by exception
- **Industry:** Pulse surfaces suggested questions per detected insight; Lazarev: lead with one or two factors, keep the trace one click away.
- **Maps to:** step 4 (reviewer cold open with three example questions), the pharma addendum (anomaly notes as annotations).
- **Our data:** anomalies array on markets (Germany 2026-03 dip) is our "detected insight".
- **Direction A:** the exec's top-movers list can carry a "Ask why" affordance per row that pre-fills the assistant. Cheap, fits the fixtures' keyword matching, and shows the coordinated-views idea in the chat direction too. Small addition.

### 4.10 Filters as visible, reversible chips in the URL
- **Industry:** Setproduct rule 7; Pulse shows applied filters on the metric page; Linear's filter chips.
- **Maps to:** step 4 (header is URL state).
- **Direction A:** active period and drill shown as removable chips next to the breadcrumbs, with "clear" returning to portfolio. No change, it is a rendering detail of what is approved.

### 4.11 Density by information value, not everywhere
- **Industry:** Linear's 13px/4px grid for power users; Setproduct's 3:1 density ratio between primary and secondary zones; Lazarev's 5 to 9 visuals per view.
- **Maps to:** step 5 (dense analyst scale from the same tokens), section 2 of Flavius's trading research.
- **Direction A:** confirmed. Concrete numbers to carry into tokens: analyst rows 32px, 4px spacing grid, 13px table text; exec tiles roomier. Cap the analyst grid at about 6 to 8 widgets. No change.

### 4.12 Colour rationing and token generation
- **Industry:** Linear uses one accent only for focus and primary action; Setproduct reserves hue for status, series and one accent; Stripe generates colour tokens against WCAG contrast.
- **Maps to:** step 3 and 5 (status reserved, AI tint separate, contrast verified), the approved token-based styling stack.
- **Direction A:** confirmed. We already run every token through a contrast check; keep that script in the repo and mention it in the README, since Stripe's version of it is a selling point.

### 4.13 Table fallback and export
- **Industry:** Spotter toggles table and chart; every pharma tool exports to Excel and PowerPoint; Lazarev: charts fall back to a readable table.
- **Maps to:** step 4 amendment ("View as table" one click on every chart).
- **Direction A:** confirmed. Export is cheap once the table exists: a "Copy as CSV" on the table view. Optional, low cost, do only if time allows.

### 4.14 Keyboard-first and command palette
- **Industry:** Linear's Cmd-K as the fallback for every action, inline shortcut hints, nothing hover-only.
- **Maps to:** brief stretch goal, the trading-research addendum.
- **Direction A:** stretch, after the core. Nothing hover-only is already implied by accessibility and should be a stated rule.

### 4.15 Dark mode designed, not inverted
- **Industry:** Stripe designed dark mode as its own theme with tokens; Linear is dark-first by audience.
- **Maps to:** step 5 (light-first with a validated dark theme).
- **Direction A:** confirmed. Flag kept from before: dark-first remains rejected for our audience.

## 7. Sources
- IQVIA PharmaReport Sales Dashboard: https://www.iqvia.com/-/media/iqvia/pdfs/belgium/iqvia-sales-dashboard.pdf
- IQVIA Brand Analytics fact sheet: https://www.iqvia.com/-/media/iqvia/pdfs/us/fact-sheet/iqvia-brand-analytics-fact-sheet-2022.pdf
- IQVIA Commercial Analytics Libraries 2025: https://www.iqvia.com/-/media/iqvia/pdfs/us/fact-sheet/2025/iqvia-commercial-analytics-libraries-fact-sheet-2025.pdf
- IQVIA Commercial Analytics 2026 infographic: https://www.iqvia.com/-/media/iqvia/pdfs/library/infographics/2026/commercial-analytics.pdf
- Veeva Compass Suite features brief: https://www.veeva.com/wp-content/uploads/2024/04/Veeva-Compass-Suite_Features-Brief.pdf
- Salesforce Life Sciences Cloud: https://www.salesforce.com/eu/healthcare-life-sciences/life-sciences-software/
- ZS ZAIDYN Insights & Analytics brief: https://www.zs.com/content/dam/pdfs/ZAIDYN-Insights-and-Analytics-Product-Brief.pdf
- Axtria SalesIQ datasheet: https://insights.axtria.com/hubfs/Datasheets/Axtria-SalesIQ-Sales-Planning-and-Operations.pdf
- Tableau Pulse, Explore metrics: https://help.tableau.com/v0.0/online/en-us/pulse_explore_metrics.htm
- ThoughtSpot Spotter, getting started: https://docs.thoughtspot.com/cloud/latest/spotter-getting-started
- ThoughtSpot, Introducing Spotter: https://www.thoughtspot.com/blog/introducing-spotter-ai-analyst
- ThoughtSpot CEO on "confident idiots": https://www.pulse.bot/saas/news/thoughtspot-ceo-most-ai-agents-are-confident-idiots-ce4dc625-b713-4f49-9331-70be82de898a/
- Hex, lessons from Ramp: https://www.plushcap.com/content/hex/blog/hex-lessons-from-ramp-running-ai-powered-data-teams
- Linear aesthetic decoded: https://www.buildmvpfast.com/blog/linear-aesthetic-tokens-density-keyboard-first-ux-2026
- Stripe dashboard redesign case study: https://mattstromawn.com/projects/stripe-dashboard/
- Setproduct, dashboard design principles: https://www.setproduct.com/blog/effective-dashboard-design-principles
- Lazarev, AI dashboard design principles: https://www.lazarev.agency/articles/ai-dashboard-design
- Aufait UX, AI design patterns for enterprise dashboards: https://www.aufaitux.com/blog/ai-design-patterns-enterprise-dashboards/
