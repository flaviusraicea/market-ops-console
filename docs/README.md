These are the working documents behind the build, drafted with AI assistance and reviewed and decided by Flavius.

## Design and architecture

- [domain-model.md](domain-model.md): entities, formulas, provenance, assistant and alert models.
- [user-flows.md](user-flows.md): users, jobs and the build slices.
- [architecture.md](architecture.md): layers, URL schema, state, contracts, testing.
- [design-system.md](design-system.md): the Ledger tokens and components.
- [industry-research.md](industry-research.md): the design aspects and the products they came from.

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

## Slice specs

- [slice-00-foundation.md](specs/slice-00-foundation.md)
- [slice-01-cold-open.md](specs/slice-01-cold-open.md)
- [slice-02-exec-overview.md](specs/slice-02-exec-overview.md)
- [slice-03-drill-share-history.md](specs/slice-03-drill-share-history.md)
- [slice-04-analyst-views.md](specs/slice-04-analyst-views.md)
- [slice-05-stream-stop.md](specs/slice-05-stream-stop.md)
- [slice-06-citations.md](specs/slice-06-citations.md)
- [slice-07-differs-from-source.md](specs/slice-07-differs-from-source.md)
- [slice-08-answer-kinds.md](specs/slice-08-answer-kinds.md)
- [slice-09-ask-why.md](specs/slice-09-ask-why.md)
- [slice-10-alerts.md](specs/slice-10-alerts.md)
- [slice-11-theme-a11y.md](specs/slice-11-theme-a11y.md)
- [slice-12-stretch.md](specs/slice-12-stretch.md)
