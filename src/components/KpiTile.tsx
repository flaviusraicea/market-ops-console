import { ArrowDownRight, ArrowUpRight, ICON_STROKE, Minus } from "@/components/icons";
import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";

export type Direction = "up" | "down" | "flat";

export type KpiTileProps = {
  /** The KPI name, already in capitals. */
  label: string;
  headline: string;
  delta: { direction: Direction; value: string; comparison: string };
  /** For example "Source · data.json" or "Derived · sum of series". */
  provenance: string;
  className?: string;
};

const DELTA_STYLE: Record<Direction, string> = {
  up: "text-ok-text",
  down: "text-bad-text",
  flat: "text-ink-2",
};

const DELTA_ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: Minus } as const;

/** Design-system 6.2. The headline is never coloured by direction; the delta carries sign, icon and colour. */
export function KpiTile({ label, headline, delta, provenance, className }: KpiTileProps) {
  const Icon = DELTA_ICON[delta.direction];
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-card border border-border bg-surface p-[var(--pad-card)]",
        className,
      )}
    >
      <Eyebrow as="p">{label}</Eyebrow>
      <p
        data-slot="kpi-headline"
        className="num font-[family-name:var(--font-display)] text-[length:var(--text-kpi)] leading-[var(--text-kpi-lh)] font-semibold tracking-[var(--text-kpi-ls)]"
      >
        {headline}
      </p>
      <p
        data-slot="kpi-delta"
        data-direction={delta.direction}
        className="num flex items-center gap-1 text-[length:var(--text-label)] leading-[var(--text-label-lh)]"
      >
        <Icon
          aria-hidden
          className={cn("size-3.5 shrink-0", DELTA_STYLE[delta.direction])}
          strokeWidth={ICON_STROKE}
        />
        <span className={cn("font-medium", DELTA_STYLE[delta.direction])}>{delta.value}</span>
        {delta.comparison ? (
          <>
            {" "}
            <span className="text-ink-muted">{delta.comparison}</span>
          </>
        ) : null}
      </p>
      <p
        data-slot="kpi-provenance"
        className="text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] text-ink-muted"
      >
        {provenance}
      </p>
    </div>
  );
}
