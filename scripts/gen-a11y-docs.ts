// Regenerates the generated parts of docs/accessibility.md: the Tab order (from tests/e2e/tabOrder.ts, the list the
// E2E asserts) and the contrast table (from `check:contrast`). `--check` fails instead of writing when the file is stale.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderTabOrders } from "../tests/e2e/tabOrder";

const root = path.join(__dirname, "..");
const docPath = path.join(root, "docs", "accessibility.md");

type Row = { kind: string; pair: string; needs: string; ratio: Partial<Record<"light" | "dark", string>> };

/** One row per token pair, with the light and dark ratios side by side. */
function contrastTable(): string {
  const output = execFileSync("pnpm", ["--silent", "check:contrast"], { cwd: root, encoding: "utf8" });
  const rows = new Map<string, Row>();
  for (const line of output.split("\n")) {
    const m = /^(PASS|FAIL)\s+(light|dark)\s+(text|graphic|non-text|decorative)\s+(\S+)\s+([\d.]+:1)\s*(?:>=\s*([\d.]+))?/.exec(line);
    if (!m) continue;
    const [, result, theme, kind, pair, ratio, needs] = m as unknown as [string, string, "light" | "dark", string, string, string, string | undefined];
    const row = rows.get(`${kind}|${pair}`) ?? { kind, pair, needs: needs ?? "none", ratio: {} };
    row.ratio[theme] = result === "FAIL" ? `${ratio} (FAIL)` : ratio;
    rows.set(`${kind}|${pair}`, row);
  }
  const lines = ["| Pair (foreground/background) | Kind | Needs | Light | Dark |", "| --- | --- | --- | --- | --- |"];
  for (const r of rows.values()) {
    lines.push(`| \`${r.pair}\` | ${r.kind} | ${r.needs === "none" ? "none" : `${r.needs}:1`} | ${r.ratio.light ?? ""} | ${r.ratio.dark ?? ""} |`);
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
const next = replaceBlock(replaceBlock(current, "tab-order", renderTabOrders()), "contrast", contrastTable());
if (process.argv.includes("--check")) {
  if (next !== current) {
    console.error("docs/accessibility.md is stale: run `pnpm docs:a11y`.");
    process.exit(1);
  }
} else if (next !== current) {
  writeFileSync(docPath, next);
}
