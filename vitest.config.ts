import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const alias = { "@": path.join(dirname, "src") };

// CHROMIUM_PATH points at a browser the machine has when Playwright's own build is missing, as check:budget does.
// A fresh object per project: Vitest registers each project's instances on it.
const browser = () => ({
  enabled: true,
  provider: playwright(
    process.env["CHROMIUM_PATH"]
      ? { launchOptions: { executablePath: process.env["CHROMIUM_PATH"] } }
      : {},
  ),
  headless: true,
  instances: [{ browser: "chromium" as const }],
});

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup.ts"],
        },
      },
      {
        resolve: { alias },
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "stories",
          browser: browser(),
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
      {
        resolve: { alias },
        define: { "import.meta.env.SB_THEME": '"dark"' },
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "stories:dark",
          browser: browser(),
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
});
