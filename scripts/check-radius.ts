// One radius family (tokens.css): every rounded corner uses a --radius-* token. Fails on literal radii in source:
// Tailwind `rounded-[…]` arbitrary values, bare `rounded`/`rounded-sm|md|lg|xl|2xl|3xl|full`, `border-radius` with
// anything but a token, `inherit` or 0, inline `borderRadius`, and SVG `rx`/`ry`.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src", ".storybook"];
const TOKENS = ["sheet", "control", "menu", "pill", "mark", "none"];
const CORNERS = "(?:-(?:t|b|l|r|s|e|tl|tr|bl|br|ss|se|es|ee))?";

const rules: { name: string; re: RegExp; ok?: (m: RegExpMatchArray) => boolean }[] = [
  {
    name: "Tailwind radius utility outside the token scale",
    re: new RegExp(`(?<![\\w-])rounded${CORNERS}(?:-([\\w\\[\\]().%-]+))?(?![\\w-])`, "g"),
    ok: (m) => m[1] !== undefined && TOKENS.includes(m[1]),
  },
  {
    name: "border-radius that is not a token, inherit or 0",
    re: /border-(?:[a-z-]*-)?radius\s*:\s*([^;]+);/g,
    ok: (m) => /^(var\(--radius-[a-z]+\)|inherit|0(px)?)$/.test(m[1]!.trim()),
  },
  { name: "inline borderRadius", re: /borderRadius\s*:/g },
  { name: "SVG rx/ry", re: /\s(?:rx|ry)=["{]/g },
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : files(p);
    return /\.(tsx?|css)$/.test(name) ? [p] : [];
  });
}

const failures: string[] = [];
for (const root of ROOTS) {
  let list: string[] = [];
  try {
    list = files(root);
  } catch {
    continue;
  }
  for (const file of list) {
    if (file.endsWith("tokens.css")) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // Prose mentions ("USD, rounded") are not classes: only check inside quotes, template strings and CSS.
      const code = file.endsWith(".css")
        ? line
        : (line.match(/(["'`])(?:(?!\1).)*\1/g) ?? []).join(" ");
      const css = file.endsWith(".css") || /style=|borderRadius|\srx=|\sry=/.test(line);
      for (const rule of rules) {
        const target = rule.name.startsWith("Tailwind") ? code : css ? line : "";
        for (const m of target.matchAll(rule.re)) {
          if (rule.ok?.(m)) continue;
          failures.push(`${file}:${i + 1}  ${rule.name}: ${m[0].trim()}`);
        }
      }
    });
  }
}

if (failures.length) {
  console.error(
    `Radius check failed (${failures.length}). Use a --radius-* token (rounded-sheet|control|menu|pill|mark|none):\n`,
  );
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Radius check passed: every corner uses a --radius-* token.");
