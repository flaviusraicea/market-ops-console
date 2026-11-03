// Asserts the contrast pairs from docs/design-system.md section 3. Exit code 1 with a table of failures.
import { rows, type Row } from "./contrast";

const fmt = (r: Row) =>
  `${r.pass ? "PASS" : "FAIL"}  ${r.theme.padEnd(5)}  ${r.kind.padEnd(10)}  ${r.pair.padEnd(34)}  ${
    r.ratio ? r.ratio.toFixed(2).padStart(6) + ":1" : "       "
  }  ${r.min ? `>= ${r.min}` : ""}`;

console.log(rows.map(fmt).join("\n"));
const failures = rows.filter((r) => !r.pass);
console.log(`\n${rows.length} checks, ${failures.length} failures`);
if (failures.length > 0) {
  console.error("\nFailures:\n" + failures.map(fmt).join("\n"));
  process.exit(1);
}
