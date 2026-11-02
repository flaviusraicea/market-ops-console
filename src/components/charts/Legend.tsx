import { cn } from "@/components/cn";

export type LegendItem = {
  label: string;
  swatch: "line-solid" | "line-dashed" | "line-dotted" | "fill";
  /** A CSS custom property name such as `--div-n3`. */
  color: string;
};

function Swatch({ swatch, color }: Pick<LegendItem, "swatch" | "color">) {
  const c = `var(${color})`;
  if (swatch === "fill") {
    return (
      <span
        aria-hidden
        className="block h-3 w-full rounded-[2px] border border-border"
        style={{ background: c }}
      />
    );
  }
  const dash = swatch === "line-dashed" ? "6 4" : swatch === "line-dotted" ? "2 3" : undefined;
  return (
    <svg aria-hidden width="16" height="2" viewBox="0 0 16 2" className="shrink-0">
      <line
        x1="0"
        y1="1"
        x2="16"
        y2="1"
        stroke={c}
        strokeWidth="2"
        {...(dash ? { strokeDasharray: dash } : {})}
      />
    </svg>
  );
}

/** Static legend (design-system 6.10). Fill swatches stack the label under the swatch so seven bins fit one row. */
export function Legend({
  items,
  label,
  className,
}: {
  items: LegendItem[];
  label: string;
  className?: string;
}) {
  const fills = items.every((i) => i.swatch === "fill");
  return (
    <ul
      aria-label={label}
      className={cn(
        "text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2",
        fills
          ? "grid w-full max-w-[30rem] grid-cols-7 gap-x-1"
          : "flex flex-wrap items-center gap-x-4 gap-y-1",
        className,
      )}
    >
      {items.map((item) => (
        <li
          key={item.label}
          className={cn(fills ? "flex min-w-0 flex-col gap-1" : "inline-flex items-center gap-1.5")}
        >
          <Swatch swatch={item.swatch} color={item.color} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
