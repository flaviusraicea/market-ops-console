// The pure half of check-budget: turns what a page loaded into table rows and failures. No I/O, so it is unit tested.

export type Asset = { file: string; kb: number };
export type Load = { js: Asset[]; css: Asset[]; fonts: Asset[] };

export type Budgets = {
  overview: { path: string; jsKb: number };
  analyst: { path: string; jsKb: number };
  /** The largest any one lazy script may be. */
  lazyChunkKb: number;
  /** Fonts the page loads. */
  fontsKb: number;
  cssKb: number;
};

export type BudgetRow = {
  name: string;
  actual: number;
  limit: number;
  pass: boolean;
  /** Passing but past 90% of the limit: the next feature will break the gate. */
  warn: boolean;
};

const WARN_AT = 0.9;

const total = (assets: Asset[]) => assets.reduce((sum, a) => sum + a.kb, 0);

/** Scripts the Analyst view loads that Overview does not: the lazy chunks. */
export function lazyChunks(overview: Load, analyst: Load): Asset[] {
  const base = new Set(overview.js.map((a) => a.file));
  return analyst.js.filter((a) => !base.has(a.file));
}

export function evaluate(b: Budgets, overview: Load, analyst: Load): BudgetRow[] {
  const row = (name: string, actual: number, limit: number): BudgetRow => ({
    name,
    actual,
    limit,
    pass: actual <= limit,
    warn: actual <= limit && actual > limit * WARN_AT,
  });
  const rows = [
    row("Overview JS", total(overview.js), b.overview.jsKb),
    row("Analyst JS (with Overview's)", total(analyst.js), b.analyst.jsKb),
    row("Overview CSS", total(overview.css), b.cssKb),
    row("Analyst CSS", total(analyst.css), b.cssKb),
    row("Overview fonts", total(overview.fonts), b.fontsKb),
    row("Analyst fonts", total(analyst.fonts), b.fontsKb),
  ];
  const largest = lazyChunks(overview, analyst).sort((x, y) => y.kb - x.kb)[0];
  rows.push(
    row(
      `Largest lazy chunk${largest ? ` (${largest.file})` : ""}`,
      largest?.kb ?? 0,
      b.lazyChunkKb,
    ),
  );
  return rows;
}

const kb = (n: number) => n.toFixed(1).padStart(7);

export function format(rows: BudgetRow[]): string {
  const width = Math.max(...rows.map((r) => r.name.length));
  const lines = rows.map(
    (r) =>
      `${r.pass ? (r.warn ? "WARN" : "PASS") : "FAIL"}  ${r.name.padEnd(width)}  ${kb(r.actual)} KB  <= ${kb(r.limit)} KB`,
  );
  return lines.join("\n");
}
