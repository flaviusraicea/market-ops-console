/**
 * SVG path data from points, coordinates rounded to one decimal. Geometry only, never text a reader sees:
 * this is the one place outside lib/format.ts allowed to call toFixed (see eslint.config.mjs).
 */
export function svgPath(points: ReadonlyArray<readonly [number, number]>, closed = false): string {
  const d = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  return closed ? `${d} Z` : d;
}
