import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { renderTabOrders } from "../e2e/tabOrder";

describe("docs/accessibility.md", () => {
  it("carries the Tab order the E2E asserts (run `pnpm docs:a11y` after changing tests/e2e/tabOrder.ts)", () => {
    const doc = readFileSync(path.join(__dirname, "..", "..", "docs", "accessibility.md"), "utf8");
    const block = /<!-- tab-order:start -->\n([\s\S]*?)\n<!-- tab-order:end -->/.exec(doc)?.[1];
    expect(block).toBe(renderTabOrders().trimEnd());
  });
});
