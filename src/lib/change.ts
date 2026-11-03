/** Month-on-month change in percent, or null when there is no earlier month. */
export function momPct(actual: number, previous: number | undefined): number | null {
  return previous && previous > 0 ? (actual / previous - 1) * 100 : null;
}
