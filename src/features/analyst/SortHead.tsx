import { cn } from "@/components/cn";
import { ArrowDown, ArrowUp, ICON_STROKE } from "@/components/icons";
import { TableHead } from "@/components/ui/table";

export type SortState<K extends string> = { key: K; dir: "asc" | "desc" };

/**
 * A column header that sorts. The first activation of a column goes `firstDir`; every later one flips it.
 * `aria-sort` says which column is sorted and which way.
 */
export function SortHead<K extends string>({
  label,
  column,
  sort,
  onSort,
  firstDir = "desc",
  align = "right",
  className,
}: {
  label: string;
  column: K;
  sort: SortState<K> | null;
  onSort: (next: SortState<K>) => void;
  firstDir?: "asc" | "desc";
  align?: "left" | "right";
  className?: string;
}) {
  const active = sort?.key === column;
  const Icon = sort?.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn(align === "right" && "text-right", className)}
    >
      <button
        type="button"
        onClick={() =>
          onSort({ key: column, dir: active ? (sort.dir === "asc" ? "desc" : "asc") : firstDir })
        }
        className={cn(
          "inline-flex items-center gap-1 rounded-control uppercase hover:text-ink",
          active && "text-ink",
        )}
      >
        {label}
        {active ? <Icon aria-hidden className="size-3" strokeWidth={ICON_STROKE} /> : null}
      </button>
    </TableHead>
  );
}
