import { cn } from "@/components/cn";
import { StatusGlyph, type GlyphStatus } from "@/components/StatusGlyph";

const TONE: Record<GlyphStatus, string> = {
  on_track: "text-ink",
  at_risk: "bg-warn-bg text-warn-text",
  off_track: "bg-bad-bg text-bad-text",
};

// sm sits in table and list rows; md in tiles, the attention list and tooltips (24 px; a badge is not a control, so the touch target size does not apply).
const SIZE = {
  sm: { box: "h-5 text-[11px] leading-[14px]", glyph: "size-2" },
  md: {
    box: "h-6 text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
    glyph: "size-2.5",
  },
} as const;

/**
 * The one status mark in the app: a glyph that differs by shape (dot, triangle, diamond) then the status word.
 * Only at risk and off track are tinted, so a screen of healthy markets stays quiet. The word is the accessible
 * label and the glyph is decoration. Every variant reserves a 1 px border so the box is the same size, and forced
 * colours draw it in the system text colour.
 */
export function StatusBadge({
  status,
  label,
  size = "md",
  className,
}: {
  status: GlyphStatus;
  label: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const s = SIZE[size];
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-pill border border-transparent px-2 font-medium whitespace-nowrap forced-colors:border-[CanvasText]",
        s.box,
        TONE[status],
        className,
      )}
    >
      <StatusGlyph status={status} inherit={status !== "on_track"} className={s.glyph} />
      {label}
    </span>
  );
}
