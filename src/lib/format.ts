// Locale is fixed to en-US for deterministic output. A real product would take it from the user.
const MINUS = "−";

const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const millions = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const one = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const monthLong = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });

function parts(period: string): { y: number; m: number } {
  const [y, m] = period.split("-").map(Number) as [number, number];
  return { y, m };
}

export function formatMoneyCompact(n: number): string {
  const sign = n < 0 ? MINUS : "";
  const abs = Math.abs(n);
  if (abs >= 100_000) return `${sign}$${millions.format(abs / 1_000_000)}M`;
  return `${sign}$${int.format(abs)}`;
}

/** One decimal, for tight rows such as the region bars: "$4.4M". Below $100K it falls back to whole dollars. */
export function formatMoneyBrief(n: number): string {
  const sign = n < 0 ? MINUS : "";
  const abs = Math.abs(n);
  if (abs >= 100_000) return `${sign}$${one.format(abs / 1_000_000)}M`;
  return `${sign}$${int.format(abs)}`;
}

export function formatMoneyFull(n: number): string {
  return `${n < 0 ? MINUS : ""}${int.format(Math.abs(n))}`;
}

export function formatPct(n: number, { sign }: { sign: boolean }): string {
  const rounded = Math.round(n * 10) / 10;
  const body = one.format(Math.abs(rounded));
  if (rounded === 0) return `${body}%`;
  if (rounded < 0) return `${MINUS}${body}%`;
  return `${sign ? "+" : ""}${body}%`;
}

export function formatPeriod(p: string): string {
  const { y, m } = parts(p);
  return `${monthLong.format(new Date(Date.UTC(y, m - 1, 1)))} ${y}`;
}

/** "Jun 2024": abbreviated month, full year (the assistant's coverage line). */
export function formatPeriodAbbr(p: string): string {
  const { y, m } = parts(p);
  return `${monthShort.format(new Date(Date.UTC(y, m - 1, 1)))} ${y}`;
}

export function formatPeriodShort(p: string): string {
  const { y, m } = parts(p);
  return `${monthShort.format(new Date(Date.UTC(y, m - 1, 1)))} ${String(y).slice(2)}`;
}

/** "February": the month name alone, for sentences such as "versus February". */
export function formatMonthName(p: string): string {
  const { y, m } = parts(p);
  return monthLong.format(new Date(Date.UTC(y, m - 1, 1)));
}

/** "Feb": the short month name alone, for chart labels such as "−27% vs Feb". */
export function formatMonthShort(p: string): string {
  const { y, m } = parts(p);
  return monthShort.format(new Date(Date.UTC(y, m - 1, 1)));
}

/** Axis label: "$0", "$0.5M", "$2.5M". */
export function formatMoneyAxis(n: number): string {
  if (n === 0) return "$0";
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n / 1_000_000)}M`;
}

export function formatInt(n: number): string {
  return int.format(n);
}

export function formatCount(a: number, b: number): string {
  return `${a} of ${b}`;
}
