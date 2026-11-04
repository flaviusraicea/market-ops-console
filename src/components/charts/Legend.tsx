"use client";

import { cn } from "@/components/cn";
import { PHONE_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { StatusGlyph } from "@/components/StatusGlyph";

export type LegendItem =
  | {
      label: string;
      swatch: "line-solid" | "line-dashed" | "line-dotted" | "fill";
      /** A CSS custom property name such as `--div-n3`. */
      color: string;
    }
  | {
      label: string;
      /** The status mark used across the page: dot, triangle or diamond. */
      swatch: "status";
      status: "on_track" | "at_risk" | "off_track";
    };

function Swatch(item: Extract<LegendItem, { color: string }>) {
  const { swatch, color } = item;
  const c = `var(${color})`;
  if (swatch === "fill") {
    return (
      <span
        aria-hidden
        className="block h-3 w-full rounded-none border border-border"
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

/**
 * Static legend (design-system 6.10). Status marks sit inline and centred. Fill swatches stack a centred label under the swatch. Seven bins sit
 * on one row from 1100px up; below that they wrap to two rows, the first three bins (the low side of the
 * scale) on the first row and the remaining four (the neutral bin and the high side) on the second.
 */
export function Legend({
  items,
  label,
  className,
}: {
  items: LegendItem[];
  label: string;
  className?: string;
}) {
  const fills = items.length === 7 && items.every((i) => i.swatch === "fill");
  // On a phone the seven bins are one row that scrolls sideways, so the row takes focus for the keyboard.
  const scrolls = useMediaQuery(PHONE_QUERY) && fills;
  return (
    <ul
      aria-label={label}
      {...(scrolls ? { tabIndex: 0 } : {})}
      className={cn(
        "text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2",
        fills
          ? "grid w-full max-w-[40rem] grid-cols-4 gap-x-3 gap-y-2 min-[1100px]:grid-cols-7 max-md:flex max-md:max-w-none max-md:overflow-x-auto max-md:pb-1"
          : "flex flex-wrap items-center gap-x-4 gap-y-1",
        items.every((i) => i.swatch === "status") && "justify-center gap-x-6",
        className,
      )}
    >
      {items.map((item, i) => (
        <li
          key={item.label}
          className={cn(
            fills
              ? "flex min-w-0 flex-col items-center gap-1 text-center whitespace-nowrap max-md:min-w-[72px] max-md:shrink-0"
              : "inline-flex items-center gap-1.5",
            fills && items.length === 7 && i === 3 && "col-start-1 min-[1100px]:col-auto",
          )}
        >
          {item.swatch === "status" ? <StatusGlyph status={item.status} /> : <Swatch {...item} />}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
