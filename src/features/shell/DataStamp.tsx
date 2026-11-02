import { formatPeriod } from "@/lib/format";

export function DataStamp({ latestPeriod }: { latestPeriod: string }) {
  return (
    <span
      title={`Source: data.json, latest period ${latestPeriod}`}
      className="inline-flex items-center gap-1.5 text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] whitespace-nowrap text-ink-muted uppercase"
    >
      <span aria-hidden className="size-1.5 rounded-pill bg-ok-mark" />
      Data through {formatPeriod(latestPeriod)}
    </span>
  );
}
