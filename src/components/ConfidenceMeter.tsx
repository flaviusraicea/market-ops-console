import { ICON_STROKE, Shield, ShieldAlert, ShieldCheck } from "@/components/icons";
import { cn } from "@/components/cn";

export type ConfidenceLevel = "high" | "medium" | "low";

// Design-system.md 6.6: three fixed levels, word plus icon plus bars, never a percentage or a status colour.
const LEVELS = {
  high: {
    bars: 3,
    word: "High confidence",
    meaning: "Directly supported by cited data",
    Icon: ShieldCheck,
  },
  medium: {
    bars: 2,
    word: "Medium confidence",
    meaning: "Supported, with gaps in the data",
    Icon: Shield,
  },
  low: {
    bars: 1,
    word: "Low confidence",
    meaning: "Directional only, verify before acting",
    Icon: ShieldAlert,
  },
} as const;

export function ConfidenceMeter({
  level,
  className,
  compact = false,
}: {
  level: ConfidenceLevel;
  className?: string;
  /** The answer card's header form: `▬▬▬ ✓ High` (the meter says what it is). The accessible name stays the full sentence. */
  compact?: boolean;
}) {
  const { bars, word, meaning, Icon } = LEVELS[level];
  const label = `${word}: ${meaning.charAt(0).toLowerCase()}${meaning.slice(1)}`;
  if (compact) {
    return (
      <div
        role="img"
        aria-label={label}
        className={cn("inline-flex items-center gap-1.5", className)}
      >
        <span aria-hidden className="inline-flex gap-[2px]">
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={cn("h-1.5 w-2.5 rounded-[2px]", n <= bars ? "bg-ai-label" : "bg-border")}
            />
          ))}
        </span>
        <Icon aria-hidden className="size-3 text-ai-label" strokeWidth={ICON_STROKE} />
        <span
          aria-hidden
          className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ai-label"
        >
          {word.replace(" confidence", "")}
        </span>
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("inline-flex flex-wrap items-center gap-x-2 gap-y-0.5", className)}
    >
      <Icon aria-hidden className="size-3.5 text-ink-2" strokeWidth={ICON_STROKE} />
      <span aria-hidden className="inline-flex gap-[3px]">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn("h-1.5 w-3.5 rounded-[2px]", n <= bars ? "bg-ink-2" : "bg-border")}
          />
        ))}
      </span>
      <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink">
        {word}
      </span>
      <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
        {meaning}
      </span>
    </div>
  );
}
