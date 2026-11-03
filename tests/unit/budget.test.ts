import { describe, expect, it } from "vitest";

import { evaluate, format, lazyChunks, type Budgets, type Load } from "../../scripts/budget";

const budgets: Budgets = {
  overview: { path: "/", jsKb: 250 },
  analyst: { path: "/?mode=analyst", jsKb: 350 },
  lazyChunkKb: 60,
  fontsKb: 110,
  cssKb: 20,
};
const asset = (file: string, kb: number) => ({ file, kb });
const overview: Load = {
  js: [asset("framework.js", 170), asset("app.js", 60)],
  css: [asset("a.css", 12)],
  fonts: [asset("serif.woff2", 48), asset("sans.woff2", 49)],
};
const analyst: Load = {
  ...overview,
  js: [...overview.js, asset("alerts.js", 31), asset("charts.js", 29)],
};

describe("budget evaluation", () => {
  it("passes a build inside every budget", () => {
    const rows = evaluate(budgets, overview, analyst);
    expect(rows.every((r) => r.pass)).toBe(true);
  });

  it("finds the lazy chunks as what Analyst loads on top of Overview", () => {
    expect(lazyChunks(overview, analyst).map((a) => a.file)).toEqual(["alerts.js", "charts.js"]);
  });

  it("fails the Overview budget when its scripts grow past the limit", () => {
    const heavy = { ...overview, js: [...overview.js, asset("zod.js", 30)] };
    const rows = evaluate(budgets, heavy, {
      ...analyst,
      js: [...heavy.js, asset("alerts.js", 31)],
    });
    expect(rows.find((r) => r.name === "Overview JS")).toMatchObject({ actual: 260, pass: false });
  });

  it("fails when one lazy chunk is over its limit even though the totals fit", () => {
    const big = { ...overview, js: [asset("framework.js", 100)] };
    const rows = evaluate(budgets, big, { ...big, js: [...big.js, asset("everything.js", 61)] });
    const lazy = rows.find((r) => r.name.startsWith("Largest lazy chunk"));
    expect(lazy).toMatchObject({ actual: 61, pass: false });
    expect(lazy?.name).toContain("everything.js");
  });

  it("prints a PASS or FAIL line per budget", () => {
    const out = format(evaluate(budgets, overview, analyst));
    expect(out.split("\n")).toHaveLength(7);
    expect(out).toContain("PASS  Overview JS");
  });
});
