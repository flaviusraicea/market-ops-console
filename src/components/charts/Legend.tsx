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
  const dash = swatch === "line-dashed" ? "4 4" : swatch === "line-dotted" ? "1 3" : undefined;
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
 * Static legend (design-system 6.10). Status marks sit inline and centred. Fill swatches stack a centred label
 * under the swatch. Seven bins sit on one row when the legend has 36 rem, which leaves every label at least 8 px
 * from the next; narrower, they wrap to two rows, the first three bins (the low side of the scale) on the first
 * row and the remaining four (the neutral bin and the high side) on the second.
 */
export function Legend({
  items,
  label,
  noData = false,
  className,
}: {
  items: LegendItem[];
  label: string;
  /** Maps: one more swatch, set apart from the scale, for land without a market (`--map-land`). */
  noData?: boolean;
  className?: string;
}) {
  const fills = items.length === 7 && items.every((i) => i.swatch === "fill");
  // On a phone the seven bins are one row that scrolls sideways, so the row takes focus for the keyboard.
  const scrolls = useMediaQuery(PHONE_QUERY) && fills;
  const list = (
    <ul
      aria-label={label}
      {...(scrolls ? { tabIndex: 0 } : {})}
      className={cn(
        "text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2",
        fills
          ? "grid w-full max-w-[40rem] grid-cols-4 gap-x-3 gap-y-2 @min-[36rem]:grid-cols-7 max-md:flex max-md:max-w-none max-md:overflow-x-auto max-md:pb-1"
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
            fills && items.length === 7 && i === 3 && "col-start-1 @min-[36rem]:col-auto",
          )}
        >
          {item.swatch === "status" ? <StatusGlyph status={item.status} /> : <Swatch {...item} />}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
  // The bins' column count follows the room the scale itself has, not the viewport.
  const scale = fills ? (
    <div className="@container flex w-full min-w-0 justify-center">{list}</div>
  ) : (
    list
  );
  if (!noData) return scale;
  // With room, the scale stays centred under the map and No data sits in the right-hand column, mirrored by an
  // empty left one. Under 40 rem No data takes its own centred row under the scale.
  return (
    <div className="@container/legend w-full">
      <div className="grid w-full grid-cols-[minmax(72px,1fr)_minmax(0,40rem)_minmax(72px,1fr)] items-start gap-x-4 md:@max-[40rem]/legend:flex md:@max-[40rem]/legend:flex-col md:@max-[40rem]/legend:items-center md:@max-[40rem]/legend:gap-y-2 max-md:flex max-md:flex-col max-md:gap-y-2">
        <span aria-hidden className="max-md:hidden md:@max-[40rem]/legend:hidden" />
        {scale}
        <p className="flex w-[72px] flex-col items-center gap-1 justify-self-start text-center text-[length:var(--text-label)] leading-[var(--text-label-lh)] whitespace-nowrap text-ink-2 max-md:w-auto max-md:flex-row">
          <span
            aria-hidden
            className="block h-3 w-full min-w-6 rounded-none border border-border bg-map-land max-md:w-6"
          />
          No data
        </p>
      </div>
    </div>
  );
}
