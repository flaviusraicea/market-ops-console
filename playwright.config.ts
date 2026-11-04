import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      testIgnore: ["**/perf/**"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Frame timing is the one measurement other tests can disturb: it runs alone, after everything else, and
      // never retries, because a retry would hide a real stall.
      name: "frame-budget",
      testMatch: ["**/perf/**/*.spec.ts"],
      dependencies: ["chromium"],
      fullyParallel: false,
      retries: 0,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Serves the production build; `pnpm run ci` and the CI workflow build first.
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000,
  },
});
