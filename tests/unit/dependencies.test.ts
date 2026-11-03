import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = path.resolve(__dirname, "../..");
const LLM = /^(openai|@anthropic-ai\/.*|ai|@ai-sdk\/.*|langchain|@langchain\/.*|llamaindex)$/;
const BRIEF = "The brief: do not wire up an actual LLM; neither earns extra credit.";

/** Every module a file pulls in: static, side-effect, re-export, dynamic import and require. */
function importsOf(source: string): string[] {
  return ts.preProcessFile(source, true, true).importedFiles.map((f) => f.fileName);
}

const external = (specs: string[]) =>
  specs.filter((s) => !s.startsWith(".") && !s.startsWith("@/"));
const allowedInRoute = /^(next(\/.*)?|zod)$/;

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
    expect(
      names.filter((n) => LLM.test(n)),
      BRIEF,
    ).toEqual([]);
  });

  it("the chat route imports nothing from node_modules except next and zod", () => {
    const src = readFileSync(path.join(root, "src/app/api/chat/route.ts"), "utf8");
    const specs = importsOf(src);
    expect(specs.length).toBeGreaterThan(0);
    expect(
      external(specs).filter((s) => !allowedInRoute.test(s)),
      BRIEF,
    ).toEqual([]);
  });

  it("the import scan sees static, side-effect, dynamic, require and re-export forms", () => {
    const src = [
      'import a from "openai";',
      'import "openai/shims/node";',
      'import {\n  b,\n} from "ai";',
      'export * from "@anthropic-ai/sdk";',
      'const c = await import("langchain");',
      'const d = require("llamaindex");',
    ].join("\n");
    expect(external(importsOf(src)).sort()).toEqual(
      ["@anthropic-ai/sdk", "ai", "langchain", "llamaindex", "openai", "openai/shims/node"].sort(),
    );
  });
});
