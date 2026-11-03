// Reads app/tokens.css, builds the light and dark token maps and evaluates the pairs from
// docs/design-system.md section 3. `check-contrast.ts` prints and gates on it; `gen-a11y-docs.ts` publishes it.
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.join(__dirname, "..", "src", "app", "tokens.css"), "utf8");

function declarations(block: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    map.set(m[1] as string, (m[2] as string).toUpperCase());
  }
  return map;
}

function blockAfter(selector: string): string {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`Unclosed block: ${selector}`);
}

const light = declarations(blockAfter(":root {"));
const dark = declarations(blockAfter(':root[data-theme="dark"]'));
const darkMedia = declarations(blockAfter("@media (prefers-color-scheme: dark)"));

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const pairs = (list: string): Array<[string, string]> =>
  list.split(",").map((p) => p.trim().split("/") as [string, string]);

const TEXT = pairs(
  "ink/surface, ink/bg, ink-2/surface, ink-2/bg, ink-2/surface-2, ink-muted/surface, ink-muted/bg, ink-muted/surface-2, accent/surface, accent/bg, accent/accent-soft, on-accent/accent, ok-text/ok-bg, ok-text/surface, warn-text/warn-bg, warn-text/surface, warn-text/accent-soft, bad-text/bad-bg, bad-text/surface, ai-label/ai-bg, ink/ai-bg, ink/accent-soft, ink/bad-bg, ink-2/bad-bg, on-bad/bad-mark",
);
const GRAPHIC = pairs(
  "ok-mark/surface, warn-mark/surface, bad-mark/surface, bad-mark/bad-bg, focus/surface, series-actual/surface, series-forecast/surface, series-prior/surface, cat-1/surface, cat-2/surface, cat-3/surface, cat-4/surface, cat-5/surface, cat-6/surface",
);
// Visibility, not WCAG text contrast: the land must read against the card (floor 1.15:1).
const LAND = pairs("map-land/surface");
const DECORATIVE = pairs(
  "border/surface, grid/surface, surface-2/surface, ai-border/ai-bg, bg/surface",
);

export type Row = {
  theme: string;
  kind: string;
  pair: string;
  ratio: number;
  min: number | null;
  pass: boolean;
};
export const rows: Row[] = [];

function check(theme: string, map: Map<string, string>) {
  const run = (list: Array<[string, string]>, kind: string, min: number | null) => {
    for (const [fg, bg] of list) {
      const a = map.get(fg);
      const b = map.get(bg);
      if (!a || !b) {
        rows.push({ theme, kind, pair: `${fg}/${bg} (missing token)`, ratio: 0, min, pass: false });
        continue;
      }
      const r = ratio(a, b);
      rows.push({
        theme,
        kind,
        pair: `${fg}/${bg}`,
        ratio: r,
        min,
        pass: min === null || r >= min,
      });
    }
  };
  run(TEXT, "text", 4.5);
  run(GRAPHIC, "graphic", 3);
  run(LAND, "non-text", 1.15);
  run(DECORATIVE, "decorative", null);

  const mono = (names: string[], label: string) => {
    const lums = names.map((n) => luminance(map.get(n) ?? "#000000"));
    const down = lums.every((l, i) => i === 0 || (lums[i - 1] as number) >= l);
    const up = lums.every((l, i) => i === 0 || (lums[i - 1] as number) <= l);
    rows.push({ theme, kind: "monotonic", pair: label, ratio: 0, min: null, pass: down || up });
  };
  mono(
    [1, 2, 3, 4, 5, 6, 7].map((i) => `seq-${i}`),
    "seq-1..7",
  );
  mono(["div-n3", "div-n2", "div-n1", "div-0"], "div-n3..0");
  mono(["div-0", "div-p1", "div-p2", "div-p3"], "div-0..p3");
}

check("light", light);
check("dark", dark);

// The OS-following dark block must carry the same values as the explicit one.
for (const [k, v] of dark) {
  if (darkMedia.get(k) !== v) {
    rows.push({
      theme: "dark",
      kind: "parity",
      pair: `--${k} differs in the media query block`,
      ratio: 0,
      min: null,
      pass: false,
    });
  }
}
