# Market Ops

A market operations console: portfolio performance, forecast attainment and an assistant.

**Live deployment:** https://market-ops-console-bay.vercel.app/

**Scope:** designed for desktop (1024 px and up), usable on tablet and phone. On a phone the Overview works fully and Analyst is readable (wide tables scroll inside their own region; the assistant is a bottom sheet), not built for operating.

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

## Try it

- `Which markets are at risk?` shows the "Differs from source" note: the assistant says 3 markets are at risk, data.json says 4 at risk and 2 off track.
- `Why did Germany dip?` shows a sourced answer with a High confidence meter and clickable citations.
- `Compare APAC and Europe` streams a comparison answer.
- `Which markets are at risk?` asked at `/?region=eu` answers about Europe's five markets only; open Germany in Analyst mode and ask `Why did revenue dip?` to get that month's numbers.
- `What will sales be next year?` is the abstain demo: the assistant declines, says what the data covers and offers a question it can answer.

## Assistant notes

- Answers stream from `POST /api/chat` (Server-Sent Events) and can be stopped; a stopped answer keeps its text, is marked partial and carries no citations or confidence.
- Every question carries the view it was asked from (entity and month, shown in the question echo), and the mock backend answers about that view: the same question gives a different, cited answer in Europe than in the portfolio. The backend is still a fake: no model and no retrieval. It matches keywords, prefers the canned answer written for the current view, and for one template answer fills in numbers read from `data.json`.
- The conversation is kept in memory for the session only. A reload starts with an empty panel.

## Data inconsistency: reported vs summed attainment

For May 2026 `data.json` states each market's forecast attainment twice: in `kpis` (the reported figure) and implicitly in `series` (actual over forecast, summed over the market's products). They disagree for all 13 markets, by up to 1.1 points. Revenue and growth agree. Neither is changed. The reported figure leads everywhere a headline is shown (KPI tiles, verdict, badges, narrative, Markets table). Where a sum is the point, the footer of a market's products table and the heat map cells for the latest month, the sum is shown with a "Differs from source" note: `Series sum 93.8% · reported KPI 93.0%`.

| Market         | Reported KPI | Series sum |
| -------------- | ------------ | ---------- |
| United States  | 100.5%       | 100.6%     |
| Canada         | 102.1%       | 101.8%     |
| Germany        | 92.0%        | 92.2%      |
| United Kingdom | 94.3%        | 94.6%      |
| France         | 96.4%        | 96.7%      |
| Italy          | 93.0%        | 93.8%      |
| Spain          | 104.5%       | 104.7%     |
| Japan          | 104.0%       | 104.2%     |
| China          | 106.0%       | 106.6%     |
| India          | 103.1%       | 104.2%     |
| Australia      | 101.8%       | 101.5%     |
| Brazil         | 96.0%        | 95.5%      |
| Mexico         | 101.0%       | 101.6%     |

## Roles (mock)

- You are signed in automatically as **Executive** (Dana Whitfield). The avatar at the right of the header shows who you are and switches to **Analyst** (Sam Okafor) in one click; `Sign out` opens a mock SSO screen with the two personas. Both roles see every page and all of the data.
- The role changes three things: the view a URL without `mode` opens on (`/` is the Executive overview for an Executive and the Analyst deep-dive for an Analyst; a `mode` in a shared link always wins), whether alert rules can be edited, and the sign-in screen. Executives read the rules; the fields are disabled and `POST`/`DELETE /api/alerts` answer `403 read_only_role`, so the rule holds where the data is written, not only in the UI.
- Nothing about it is real: no password, token or server session. The role is one cookie (`market-ops-role`, set by `src/proxy.ts` on a first visit and changed by `POST /api/session`).
- Real SSO would add an OIDC provider, a server session and role claims in the token. Region scoping would come with it: a Regional lead would see only their region's markets, and the Context invariants already make that a one-line filter in `marketsIn`.
- Old links with `mode=overview` are redirected (308) to `mode=executive`.

## Alert notes

- Analyst mode has an `Alert thresholds` card (read-only when you are signed in as Executive; see Roles). Saving writes a growth rule and an attainment rule for the chosen scope through `POST /api/alerts`; saving the same metric and scope again updates the rule.
- The alerts backend is a mock: `POST`/`DELETE /api/alerts` validate, wait 600 ms and can fail, but store nothing. Rules are saved in your browser (`localStorage`, key `market-ops:alerts:v1`), so they survive a reload, stay in this browser only, and stay in step across tabs. If storage is disabled or full they last for the session.
- The `Simulate failure` checkbox sends `?fail=1`, so the route answers 500 after its 600 ms delay and the UI shows the rollback.

## Live mode notes

- The `Live` toggle in the header (in the Analyst toolbar below 768 px) starts a 5 second tick. Each tick moves the latest month's revenue and units for every market by up to ±0.1 %, never more than ±0.3 % from `data.json`, so no status flips within a minute. Only the latest month ticks; a past month is never revised. Pause freezes the simulated figures where they are until a reload. The numbers are simulated: nothing is fetched, nothing is saved, and a reload returns to the real data.
- Live mode is a client-side overlay. `applyLiveOverlay(dataset, tick)` in `src/lib/live.ts` is pure and seeded by the tick, so tests and stories replay the same sequence. The server still renders from `data.json`; when Live is first turned on the browser loads the full dataset in a lazy chunk and recomputes each widget's view model with the same functions the server uses.
- While live, a market's status is recomputed from its moved figures with the published rule (off track when growth is negative or attainment is below about 92.5 %; at risk below 100 %). This is the only place the app derives a market's status; captions read `Derived · live`.
- The URL, drill path, selection, open rail, palette and conversation are untouched. The assistant does not see the overlay and keeps answering from the saved data; the composer says so.
- Pausing freezes the figures. A hidden tab skips ticks. Under reduced motion values swap instantly and the pulsing dot is static.
