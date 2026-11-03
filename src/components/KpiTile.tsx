import { ArrowDownRight, ArrowUpRight, ICON_STROKE, Minus } from "@/components/icons";
import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { InfoTip } from "@/components/InfoTip";
import { Sparkline } from "@/components/charts/Sparkline";

export type Direction = "up" | "down" | "flat";

export type KpiTileProps = {
  /** The KPI name, already in capitals. */
  label: string;
  /** What a tile too narrow for `label` shows instead (the Overview tiles on a phone). The name stays `label`. */
  shortLabel?: string;
  headline: string;
  delta: { direction: Direction; value: string; comparison: string };
  /** For example "Source · data.json" or "Derived · sum of series". */
  provenance: string;
  /** Accessible name of the info button, for example "About forecast attainment". */
  infoLabel?: string;
  /** Monthly actuals with the forecast beside them, drawn as a small line under the headline. */
  trend?: { actual: readonly number[]; forecast: readonly number[]; label: string } | undefined;
  /** `strip` is the Analyst ledger cell: no card, one line of eyebrow, headline and delta, provenance in a tooltip. */
  variant?: "tile" | "strip";
  className?: string;
};

const DELTA_STYLE: Record<Direction, string> = {
  up: "text-ok-text",
  down: "text-bad-text",
  flat: "text-ink-2",
};

const DELTA_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;

/** Design-system 6.2. The headline is never coloured by direction; the delta carries sign, icon and colour. */
export function KpiTile({
  label,
  shortLabel,
  headline,
  delta,
  provenance,
  infoLabel = "About this figure",
  trend,
  variant = "tile",
  className,
}: KpiTileProps) {
  const Icon = DELTA_ICON[delta.direction];
  if (variant === "strip") {
    return (
      <div
        role="group"
        aria-label={label}
        className={cn("flex min-w-0 flex-col gap-0.5 px-[var(--pad-card)] py-2", className)}
      >
        <Eyebrow as="p">{label}</Eyebrow>
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span
            data-slot="kpi-headline"
            className="num font-[family-name:var(--font-display)] text-[length:var(--text-kpi)] leading-[var(--text-kpi-lh)] font-semibold tracking-[var(--text-kpi-ls)]"
          >
            {headline}
          </span>
          <span
            data-slot="kpi-delta"
            data-direction={delta.direction}
            className="num inline-flex items-center gap-1 text-[length:var(--text-label)] leading-[var(--text-label-lh)]"
          >
            <Icon
              aria-hidden
              className={cn("size-3 shrink-0", DELTA_STYLE[delta.direction])}
              strokeWidth={ICON_STROKE}
            />
            <span className={cn("font-medium", DELTA_STYLE[delta.direction])}>{delta.value}</span>
            {delta.comparison ? <span className="text-ink-muted">{delta.comparison}</span> : null}
          </span>
        </p>
        <p className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted">
          {provenance}
        </p>
      </div>
    );
  }
  return (
    <div
      role="group"
      data-slot="kpi"
      aria-label={label}
      className={cn(
        "@container/kpi flex min-w-0 flex-col gap-1 rounded-card border border-border bg-surface shadow-card p-[var(--pad-card)]",
        className,
      )}
    >
      <Eyebrow as="p">
        {shortLabel ? (
          <>
            <span className="@max-[190px]/kpi:hidden">{label}</span>
            <span aria-hidden className="hidden @max-[190px]/kpi:inline">
              {shortLabel}
            </span>
          </>
        ) : (
          label
        )}
      </Eyebrow>
      <div className="-mr-1.5 flex items-center justify-between gap-1">
        <p
          data-slot="kpi-headline"
          className="num font-[family-name:var(--font-display)] text-[length:var(--text-kpi)] leading-[var(--text-kpi-lh)] font-semibold tracking-[var(--text-kpi-ls)]"
        >
          {headline}
        </p>
        <InfoTip label={infoLabel}>{provenance}</InfoTip>
      </div>
      {trend ? (
        <Sparkline values={trend.actual} secondary={trend.forecast} label={trend.label} />
      ) : null}
      <p
        data-slot="kpi-delta"
        data-direction={delta.direction}
        className="num flex flex-wrap items-center gap-x-1 text-[length:var(--text-label)] leading-[var(--text-label-lh)]"
      >
        <span className="inline-flex min-w-0 items-start gap-x-1">
          <Icon
            aria-hidden
            className={cn(
              "mt-[calc((1lh-0.875rem)/2)] size-3.5 shrink-0",
              DELTA_STYLE[delta.direction],
            )}
            strokeWidth={ICON_STROKE}
          />
          <span className={cn("font-medium", DELTA_STYLE[delta.direction])}>{delta.value}</span>
        </span>
        {delta.comparison ? (
          <>
            {" "}
            <span className="whitespace-nowrap text-ink-muted">{delta.comparison}</span>
          </>
        ) : null}
      </p>
      <span data-slot="kpi-provenance" className="sr-only">
        {provenance}
      </span>
    </div>
  );
}
