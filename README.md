# Market Ops

A market operations console: portfolio performance, forecast attainment and an assistant.

**Live deployment:** https://market-ops-console-bay.vercel.app/

## Quick setup

- Node 22 (`engines` in `package.json`) and pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| Script                               | What it does                                                          |
| ------------------------------------ | --------------------------------------------------------------------- |
| `pnpm dev` / `build` / `start`       | Next.js development server, production build, production server       |
| `pnpm lint` / `typecheck`            | ESLint (including layer boundaries) and `tsc --noEmit`                |
| `pnpm test`                          | All Vitest projects: `unit`, `stories`, `stories:dark`                |
| `pnpm test:unit` / `test:stories`    | Unit tests (jsdom) and Storybook stories in headless Chromium         |
| `pnpm test:e2e`                      | Playwright journeys with axe, against the production build            |
| `pnpm storybook` / `build-storybook` | Component workbench on port 6006, static build to `storybook-static/` |
| `pnpm check:contrast`                | Asserts every design-token contrast pair in both themes               |
| `pnpm run ci`                        | Lint, typecheck, contrast, tests, build and Storybook build           |

Component tests are Storybook stories with play functions; `pnpm test:stories` runs them headless in Chromium. Run `pnpm exec playwright install chromium` once before the browser tests.

Design and architecture documents live in `/docs` (copied from the design folder).

## Assistant notes

- Answers stream from `POST /api/chat` (Server-Sent Events) and can be stopped; a stopped answer keeps its text, is marked partial and carries no citations or confidence.
- The conversation is kept in memory for the session only. A reload starts with an empty panel.

## Alert notes

- Analyst mode has an `Alert thresholds` card. Saving writes a growth rule and an attainment rule for the chosen scope through `POST /api/alerts`; saving the same metric and scope again updates the rule.
- Rules live in memory on the server instance (`src/app/api/alerts/route.ts`), so they reset when the server restarts and are not shared between instances.
- The `Simulate failure` checkbox sends `?fail=1`, so the route answers 500 after its 600 ms delay and the UI shows the rollback.
