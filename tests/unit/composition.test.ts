import { globSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const root = path.join(__dirname, "..", "..", "src");
const files = globSync("**/*.tsx", { cwd: root }).filter((f) => !f.endsWith(".stories.tsx"));
const read = (f: string) => readFileSync(path.join(root, f), "utf8");

describe("composition rules (design-system 4.1)", () => {
  it("rule 2: the eyebrow letter-spacing lives only in Eyebrow.tsx and the chart SVG text", () => {
    const offenders = files.filter(
      (f) =>
        read(f).includes("tracking-[var(--text-caption-ls)]") &&
        f !== path.join("components", "Eyebrow.tsx") &&
        !f.startsWith(path.join("components", "charts")),
    );
    expect(offenders).toEqual([]);
  });

  it("rule 4: every component that renders formatted figures marks them `num`", () => {
    const FORMAT = /\b(formatPct|formatMoney[A-Za-z]*|formatCount)\(/;
    const offenders = files.filter(
      (f) => FORMAT.test(read(f)) && !/\b(num|tabular-nums)\b/.test(read(f)),
    );
    expect(offenders).toEqual([]);
  });
});
