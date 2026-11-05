## Design and architecture

- [domain-model.md](domain-model.md): entities, formulas, provenance, assistant and alert models.
- [user-flows.md](user-flows.md): users, jobs and the flows that serve them.
- [architecture.md](architecture.md): layers, URL schema, state, contracts, testing.
- [design-system.md](design-system.md): the Ledger tokens and components.
- [industry-research.md](industry-research.md): the design aspects and the products they came from.
- [accessibility.md](accessibility.md): keyboard tour, focus rules, contrast table and what is tested.
- [performance-monitoring.md](performance-monitoring.md): Lighthouse CI, Speed Insights, bundle budgets, errors and caching.

## Testing

Five checks come straight from the brief's wording: its four questions, no jank while streaming, safe rendering of model output, one formatting module, no LLM dependency.

## Decisions

- [0001-nextjs-app-router.md](decisions/0001-nextjs-app-router.md): Next.js App Router
- [0002-visx-charts.md](decisions/0002-visx-charts.md): visx for all four charts
- [0003-url-state-nuqs.md](decisions/0003-url-state-nuqs.md): URL as navigation state with nuqs
- [0004-tanstack-query-alerts-only.md](decisions/0004-tanstack-query-alerts-only.md): TanStack Query for the alert mutation only
- [0005-shadcn-restyled-tokens.md](decisions/0005-shadcn-restyled-tokens.md): shadcn/ui restyled onto our tokens
- [0006-storybook-component-tests.md](decisions/0006-storybook-component-tests.md): Storybook stories as the component test harness
- [0007-map-data-world-atlas.md](decisions/0007-map-data-world-atlas.md): Map geometry from world-atlas, filtered at build time
- [0008-heat-map-over-scatter.md](decisions/0008-heat-map-over-scatter.md): Heat map as the fourth visualisation
- [0009-server-state-rsc-zod.md](decisions/0009-server-state-rsc-zod.md): Server state through server components and zod
- [0010-forms-react-hook-form-zod.md](decisions/0010-forms-react-hook-form-zod.md): Forms with react-hook-form and zod
- [0011-testing-stack.md](decisions/0011-testing-stack.md): Testing stack
- [0012-deploy-vercel.md](decisions/0012-deploy-vercel.md): Deploy on Vercel
- [0013-performance-budgets.md](decisions/0013-performance-budgets.md): Performance budgets enforced in CI
- [0014-content-security-policy.md](decisions/0014-content-security-policy.md): A nonce Content-Security-Policy and the standard security headers
- [0015-chrome-ignores-density.md](decisions/0015-chrome-ignores-density.md): The header stays at Executive density in both modes
