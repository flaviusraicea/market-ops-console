// Regenerates the generated parts of docs/accessibility.md: the Tab order (from tests/e2e/tab-order.ts, the list the
// E2E asserts) and the contrast table (from `check:contrast`). `--check` fails instead of writing when the file is stale.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderTabOrders } from "../tests/e2e/tab-order";
import { rows } from "./contrast";

const root = path.join(__dirname, "..");
const docPath = path.join(root, "docs", "accessibility.md");

/** One row per token pair, with the light and dark ratios side by side. */
function contrastTable(): string {
  const pairs = new Map<
    string,
    { kind: string; pair: string; min: number | null; ratio: Partial<Record<string, string>> }
  >();
  for (const r of rows) {
    if (r.kind === "monotonic" || r.kind === "parity") continue;
    const entry = pairs.get(`${r.kind}|${r.pair}`) ?? {
      kind: r.kind,
      pair: r.pair,
      min: r.min,
      ratio: {},
    };
    entry.ratio[r.theme] = `${r.ratio.toFixed(2)}:1${r.pass ? "" : " (FAIL)"}`;
    pairs.set(`${r.kind}|${r.pair}`, entry);
  }
  if (pairs.size === 0) throw new Error("No contrast pairs to publish");
  const lines = [
    "| Pair (foreground/background) | Kind | Needs | Light | Dark |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const e of pairs.values()) {
    lines.push(
      `| \`${e.pair}\` | ${e.kind} | ${e.min === null ? "none" : `${e.min}:1`} | ${e.ratio["light"] ?? ""} | ${e.ratio["dark"] ?? ""} |`,
    );
  }
  return lines.join("\n");
}

function replaceBlock(doc: string, name: string, body: string): string {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const a = doc.indexOf(start);
  const b = doc.indexOf(end);
  if (a < 0 || b < a) throw new Error(`Markers for ${name} not found in docs/accessibility.md`);
  return `${doc.slice(0, a + start.length)}\n${body.trimEnd()}\n${doc.slice(b)}`;
}

const current = readFileSync(docPath, "utf8");
const next = replaceBlock(
  replaceBlock(current, "tab-order", renderTabOrders()),
  "contrast",
  contrastTable(),
);
if (process.argv.includes("--check")) {
  if (next !== current) {
    console.error("docs/accessibility.md is stale: run `pnpm docs:a11y`.");
    process.exit(1);
  }
} else if (next !== current) {
  writeFileSync(docPath, next);
}
