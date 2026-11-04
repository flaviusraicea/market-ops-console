import { ArrowDownRight, ArrowUpRight, ICON_STROKE, Minus } from "@/components/icons";
import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import { InfoTip } from "@/components/InfoTip";
import { StatusBadge } from "@/components/StatusBadge";
import type { GlyphStatus } from "@/components/StatusGlyph";
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
  /** The status tile shows the status badge, labelled with `headline`, in place of a figure. */
  status?: GlyphStatus;
  /** `strip` is the Analyst ledger cell: the same content as the tile, without its own card. */
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
  status,
  variant = "tile",
  className,
}: KpiTileProps) {
  const Icon = DELTA_ICON[delta.direction];
  return (
    <div
      role="group"
      data-slot="kpi"
      aria-label={label}
      className={cn(
        "@container/kpi flex min-w-0 flex-col gap-1",
        // The Overview tile is its own card; the Analyst cell is one section of the ruled strip.
        variant === "tile"
          ? "rounded-sheet layer-card p-[var(--pad-card)]"
          : "px-[var(--pad-card)] py-3",
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
      <div className="-mr-1.5 flex min-h-[var(--text-kpi-lh)] items-center justify-between gap-1">
        {status ? (
          <p data-slot="kpi-headline" className="min-w-0">
            <StatusBadge status={status} label={headline} size="md" />
          </p>
        ) : (
          <p
            data-slot="kpi-headline"
            className="num font-[family-name:var(--font-display)] text-[length:var(--text-kpi)] leading-[var(--text-kpi-lh)] font-semibold tracking-[var(--text-kpi-ls)]"
          >
            {headline}
          </p>
        )}
        <InfoTip label={infoLabel}>{provenance}</InfoTip>
      </div>
      {trend ? (
        <Sparkline values={trend.actual} secondary={trend.forecast} label={trend.label} />
      ) : null}
      <p
        data-slot="kpi-delta"
        data-direction={delta.direction}
        className={cn(
          "num flex items-center gap-x-1 text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
          // The status tile's caption wraps between its parts ("Attainment 102.6% ·" / "Growth +12.7%"), never mid-part.
          status ? "min-w-0" : "flex-wrap",
        )}
      >
        <span className="inline-flex min-w-0 items-start gap-x-1">
          {status ? null : (
            <Icon
              aria-hidden
              className={cn(
                "mt-[calc((1lh-0.875rem)/2)] size-3.5 shrink-0",
                DELTA_STYLE[delta.direction],
              )}
              strokeWidth={ICON_STROKE}
            />
          )}
          <span className={cn("font-medium", DELTA_STYLE[delta.direction])}>
            {status ? <StatusCaption text={delta.value} /> : delta.value}
          </span>
        </span>
        {delta.comparison ? (
          <>
            {" "}
            <span className="whitespace-nowrap text-ink-muted">{delta.comparison}</span>
          </>
        ) : null}
      </p>
      {variant === "tile" ? (
        <span data-slot="kpi-provenance" className="sr-only">
          {provenance}
        </span>
      ) : null}
    </div>
  );
}

/** "Attainment 102.6% · Growth +12.7%" as parts that wrap only at the separator, which stays at the line's end. */
function StatusCaption({ text }: { text: string }) {
  const parts = text.split(" · ");
  return parts.map((part, i) => (
    <span key={i} className="whitespace-nowrap">
      {part}
      {i < parts.length - 1 ? " · " : ""}
      {i < parts.length - 1 ? <wbr /> : null}
    </span>
  ));
}
