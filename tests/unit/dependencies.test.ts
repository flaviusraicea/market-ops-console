import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const LLM = /^(openai|@anthropic-ai\/.*|ai|@ai-sdk\/.*|langchain|@langchain\/.*|llamaindex)$/;

describe("no LLM in the box", () => {
  it("package.json has no LLM SDK", () => {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    const hits = names.filter((n) => LLM.test(n));
    expect(hits, "The brief: do not wire up an actual LLM; neither earns extra credit.").toEqual(
      [],
    );
  });

  it("the chat route imports nothing from node_modules except next and zod", () => {
    const src = readFileSync(path.join(root, "src/app/api/chat/route.ts"), "utf8");
    const specifiers = [
      ...src.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s+["']([^"']+)["']/gm),
    ].map((m) => m[1] as string);
    expect(specifiers.length).toBeGreaterThan(0);
    const external = specifiers.filter((s) => !s.startsWith(".") && !s.startsWith("@/"));
    for (const s of external) {
      expect(s, `route.ts imports ${s}`).toMatch(/^(next(\/.*)?|zod)$/);
    }
  });
});
