# Performance monitoring

Two tools watch performance, and they answer different questions.

## Lighthouse CI (lab data)

Runs in CI on every push and pull request (`.github/workflows/lighthouse.yml`, configured in `lighthouserc.json`). It builds the app, serves the production build with `next start`, and audits `/` and an Analyst URL with the desktop preset, three runs each, taking the median.

It measures a controlled load on a fixed machine and network: performance score, LCP, CLS, TBT, script weight and total bytes, plus the accessibility score. Because the conditions are the same every time, a change in the number is caused by a change in the code, which makes it the right tool for catching regressions before merge. The report for each run is uploaded to temporary public storage and linked in the job summary.

Assertions:

- Accessibility score below 0.95 fails the job. Accessibility is a hard requirement.
- Performance score, LCP, CLS, TBT and script and total weight only warn for now. The first-load script budget is 250 KB gzipped and we are knowingly over it; the performance pass at the end of the build will fix that and can then promote these to errors.

## Vercel Speed Insights (real-user data)

`<SpeedInsights />` in the root layout reports Core Web Vitals from real visitors' browsers: LCP, CLS, INP, FCP and TTFB, split by route, device and country.

Lab data cannot see the variety of devices, networks and interaction patterns of real users, and Lighthouse cannot measure INP at all because it needs real interactions. Speed Insights shows how the app actually feels in use.

It only reports once the app is deployed on Vercel with Speed Insights enabled for the project. Locally and in CI the component does nothing. The existing `WebVitals` hook is separate and only logs in development.

## Which to use

Use Lighthouse CI to stop regressions at review time. Use Speed Insights to confirm what users experience after release. A good lab score does not guarantee good field numbers, and the reverse.
