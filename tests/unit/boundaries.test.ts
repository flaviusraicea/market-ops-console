import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import { afterAll, describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const dir = path.join(root, "src", "components", "__boundary_fixture__");

afterAll(() => rmSync(dir, { recursive: true, force: true }));

async function lint(rel: string, code: string) {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), code);
  const eslint = new ESLint({ cwd: root });
  const [result] = await eslint.lintFiles([rel]);
  return result?.messages.filter((m) => m.ruleId === "no-restricted-imports") ?? [];
}

describe("layer boundaries", () => {
  it("components may not import domain", async () => {
    const msgs = await lint(
      "src/components/__boundary_fixture__/bad.ts",
      'import { parseDataset } from "@/domain";\nexport const x = parseDataset;\n',
    );
    expect(msgs.length).toBeGreaterThan(0);
  });
  it("components may not import features", async () => {
    const msgs = await lint(
      "src/components/__boundary_fixture__/bad2.ts",
      'import { Header } from "@/features/shell/Header";\nexport const x = Header;\n',
    );
    expect(msgs.length).toBeGreaterThan(0);
  });
  it("domain may not import react", async () => {
    const msgs = await lint(
      "src/domain/__boundary_fixture__/bad.ts",
      'import { useState } from "react";\nexport const x = useState;\n',
    );
    rmSync(path.join(root, "src", "domain", "__boundary_fixture__"), {
      recursive: true,
      force: true,
    });
    expect(msgs.length).toBeGreaterThan(0);
  });
  it("components may import lib and components", async () => {
    const msgs = await lint(
      "src/components/__boundary_fixture__/good.ts",
      'import { cn } from "@/components/cn";\nexport const x = cn;\n',
    );
    expect(msgs).toEqual([]);
  });
});
