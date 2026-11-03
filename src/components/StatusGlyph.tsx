import { cn } from "@/components/cn";

export type GlyphStatus = "on_track" | "at_risk" | "off_track";

const SHAPE: Record<GlyphStatus, { className: string; points?: string }> = {
  on_track: { className: "fill-ok-mark" },
  at_risk: { className: "fill-warn-mark", points: "5,0.75 9.5,9.25 0.5,9.25" },
  off_track: { className: "fill-bad-mark", points: "5,0.25 9.75,5 5,9.75 0.25,5" },
};

/** Status mark that differs by shape as well as colour: dot, triangle, diamond. Decorative; the text names the status. */
export function StatusGlyph({
  status,
  className,
  inherit = false,
}: {
  status: GlyphStatus;
  className?: string;
  /** Draw in the surrounding text colour instead of the status mark colour (inside a tinted badge). */
  inherit?: boolean;
}) {
  const shape = SHAPE[status];
  const fill = inherit ? "fill-current" : shape.className;
  return (
    <svg aria-hidden viewBox="0 0 10 10" className={cn("size-2.5 shrink-0", className)}>
      {shape.points ? (
        <polygon points={shape.points} className={fill} />
      ) : (
        <circle cx="5" cy="5" r="4.25" className={fill} />
      )}
    </svg>
  );
}
