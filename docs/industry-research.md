# Industry research: what popular pharma commercial analytics and modern analytics products do

Research notes from 2026-11-02. The aspects in section 4 informed the design; each one ends with how the console applies it.

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

Each aspect: what the industry does and which products show it, what our data supports, and how the console applies it in Direction A, the Ledger design (design-system.md).

### 4.1 Hierarchy is the product
- **Industry:** every pharma tool is organised as a hierarchy (nation, region, territory; brand, product). IQVIA PharmaReport, Veeva Compass levels, Salesforce product hierarchy.
- **Our data:** region, market, product, period. Fully supported.
- **In the console:** the drill path in the header and the Markets grid are the analyst's spine.

### 4.2 Compare to plan and to prior period, on every number
- **Industry:** IQVIA Brand Analytics shows changes vs the prior period; PharmaReport compares to targets; Pulse cards carry value plus change plus comparison label.
- **Our data:** actual, forecast, priorYear per row. Supported. Attainment and YoY growth are derivable everywhere, including region and portfolio totals we sum ourselves.
- **In the console:** the Pulse/Setproduct tile anatomy: headline number uncoloured, delta coloured by direction with an icon, comparison label ("vs forecast", "vs May 2025").

### 4.3 Monthly cadence and a visible "data through" stamp
- **Industry:** IQVIA libraries refresh monthly; Setproduct rule 8 says always show last updated; Veeva's "brand coverage" metric tells users how much of a projection rests on actuals.
- **Our data:** latestPeriod is 2026-05 and is not flagged provisional.
- **In the console:** the header stamp "Data through May 2026". Veeva's coverage idea is the honest version of a "blind spot" hatch, a label about certainty rather than fake data; the data has no provisional flag, so it is not shown.

### 4.4 Role-specific views
- **Industry:** ZAIDYN, Axtria and IQVIA all sell "role-specific" dashboards and workflows.
- **In the console:** Executive and Analyst personas, the mode in the URL, one token set at two density scales. The industry does this as separate dashboards per role; here the link carries the depth, so a shared view opens at the sender's depth.

### 4.5 The assistant sits beside the data and points at it
- **Industry:** Salesforce puts the agent prompt on the dashboard; Pulse returns answers with "source references"; Aufait says narrative sits beside charts, never replacing them.
- **In the console:** the lilac AI surface with citation chips is our version of Pulse's source references.

### 4.6 Verifiable answers, not confident ones
- **Industry:** Spotter shows the tokens it ran and offers "double check" and editable queries; Ramp's lesson is that trust comes from the semantic layer.
- **Our data:** fixtures give citations with marketId, productId, period and label. That is our "query tokens".
- **In the console:** each citation chip is a Spotter-style token: entity plus period, clickable, resolvable. Every answer with citations has a "Show sources" expander listing them as a table with the source value beside the assistant's wording, which is the analyst's "double check".

### 4.7 Confidence as a categorical, readable signal
- **Industry:** Lazarev: categorical bands or a short qualifier, never a bare number; Aufait shows confidence with data sources in an overlay.
- **In the console:** three levels, each a word plus an icon plus a one-line meaning.

### 4.8 Explicit fallback and abstain states
- **Industry:** Lazarev principle 6: replace blank widgets and spinners with a state that says what happened and offers a next step; Elva proposes a starting point.
- **In the console:** abstain is a first-class state with the data's coverage and a suggested next question; stopped and failed streams are marked partial.

### 4.9 Suggested questions and explain by exception
- **Industry:** Pulse surfaces suggested questions per detected insight; Lazarev: lead with one or two factors, keep the trace one click away.
- **Our data:** anomalies array on markets (Germany 2026-03 dip) is our "detected insight".
- **In the console:** three suggested questions on the cold open, and an "Ask why" button on each flagged market in Needs attention and on each Analyst grid row, which sends the question about that market. It shows the coordinated-views idea in the chat direction too.

### 4.10 Filters as visible, reversible chips in the URL
- **Industry:** Setproduct rule 7; Pulse shows applied filters on the metric page; Linear's filter chips.
- **In the console:** the drill path in the header is a row of links, so any level is one step back and the Portfolio crumb returns to the portfolio while keeping the period and mode; the period and product controls sit in the page toolbar. Every one of them is URL state.

### 4.11 Density by information value, not everywhere
- **Industry:** Linear's 13px/4px grid for power users; Setproduct's 3:1 density ratio between primary and secondary zones; Lazarev's 5 to 9 visuals per view.
- **In the console:** analyst rows 32px, a 4px spacing grid and 13px table text; Executive tiles roomier. The Analyst sheet holds seven sections: KPI strip, Markets grid, map, time series, Compare, heat map and Alerts.

### 4.12 Colour rationing and token generation
- **Industry:** Linear uses one accent only for focus and primary action; Setproduct reserves hue for status, series and one accent; Stripe generates colour tokens against WCAG contrast.
- **In the console:** status hues are reserved, the AI tint is separate, and every token pair goes through `pnpm check:contrast` in CI.

### 4.13 Table fallback and export
- **Industry:** Spotter toggles table and chart; every pharma tool exports to Excel and PowerPoint; Lazarev: charts fall back to a readable table.
- **In the console:** "View as table" is one click on every chart, and the facts table has "Copy as CSV".

### 4.14 Keyboard-first and command palette
- **Industry:** Linear's Cmd-K as the fallback for every action, inline shortcut hints, nothing hover-only.
- **In the console:** a Cmd-K / Ctrl-K command palette for drilling, switching view, asking and the theme; tooltips open on keyboard focus as well as on hover, and every chart has a table twin.

### 4.15 Dark mode designed, not inverted
- **Industry:** Stripe designed dark mode as its own theme with tokens; Linear is dark-first by audience.
- **In the console:** a light default with a designed dark theme that follows the OS; dark-first does not suit this audience.

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
