import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const eslint = new ESLint({ cwd: root });

/** Lints code as if it lived at `rel`; nothing is written to disk. Returns the messages of one rule. */
async function lint(rel: string, code: string, ruleId = "no-restricted-imports") {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, rel) });
  return result?.messages.filter((m) => m.ruleId === ruleId) ?? [];
}
const lintSyntax = (rel: string, code: string) => lint(rel, code, "no-restricted-syntax");

describe("layer boundaries", () => {
  it("components may not import domain", async () => {
    const msgs = await lint(
      "src/components/bad.ts",
      'import { parseDataset } from "@/domain";\nexport const x = parseDataset;\n',
    );
    expect(msgs.length).toBeGreaterThan(0);
  });
  it("components may not import features", async () => {
    const msgs = await lint(
      "src/components/bad2.ts",
      'import { Header } from "@/features/shell/Header";\nexport const x = Header;\n',
    );
    expect(msgs.length).toBeGreaterThan(0);
  });
  it("domain may not import react", async () => {
    const msgs = await lint(
      "src/domain/bad.ts",
      'import { useState } from "react";\nexport const x = useState;\n',
    );
    expect(msgs.length).toBeGreaterThan(0);
  });
  it("components may import lib and components", async () => {
    const msgs = await lint(
      "src/components/good.ts",
      'import { cn } from "@/components/cn";\nexport const x = cn;\n',
    );
    expect(msgs).toEqual([]);
  });
});

describe("safe rendering and one formatting module", () => {
  const inject = "export const X = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />;\n";

  it("only src/app/layout.tsx may use dangerouslySetInnerHTML", async () => {
    expect(await lintSyntax("src/app/layout.tsx", inject)).toEqual([]);
    for (const rel of [
      "src/components/X.tsx",
      "src/features/assistant/X.tsx",
      "src/app/page.tsx",
    ]) {
      const msgs = await lintSyntax(rel, inject);
      expect(msgs.map((m) => m.message)).toEqual([
        "Only app/layout.tsx may inject HTML (theme script).",
      ]);
    }
  });

  it("assigning innerHTML is banned too", async () => {
    const msgs = await lintSyntax(
      "src/components/X.ts",
      "export const f = (el: Element) => { el.innerHTML = 'x'; };\n",
    );
    expect(msgs.length).toBe(1);
  });

  it("number and date formatting calls are banned outside lib/format.ts", async () => {
    const code = [
      "export const a = (1).toFixed(1);",
      "export const b = (1).toLocaleString();",
      "export const c = new Intl.NumberFormat('en-US');",
      "export const d = new Date().toLocaleDateString();",
      "export const e = new Date().toLocaleTimeString();",
      "export const f = (1).toPrecision(3);",
      "export const g = new globalThis.Intl.NumberFormat();",
    ].join("\n");
    expect((await lintSyntax("src/components/fmt.ts", code)).length).toBe(7);
    expect((await lintSyntax("src/app/layout.tsx", code)).length).toBe(7);
    expect(await lintSyntax("src/lib/format.ts", code)).toEqual([]);
  });

  it("toFixed is allowed only in the SVG path helper", async () => {
    const code = "export const a = (1).toFixed(1);\n";
    expect(await lintSyntax("src/components/charts/svgPath.ts", code)).toEqual([]);
    expect((await lintSyntax("src/components/charts/RadarChart.tsx", code)).length).toBe(1);
    expect((await lintSyntax("src/components/charts/Sparkline.tsx", code)).length).toBe(1);
  });
});
