import { Skeleton } from "@/components/ui/skeleton";
import { PageToolbarSkeleton } from "@/features/shell/PageToolbarSkeleton";
import { cn } from "@/components/cn";

function Tile() {
  return (
    <div className="flex flex-col gap-1 rounded-sheet layer-card p-[var(--pad-card)]">
      <Skeleton className="h-[11px] w-24" />
      <Skeleton className="mt-1 h-7 w-32" />
      <Skeleton className="mt-1 h-3 w-20" />
    </div>
  );
}

/**
 * Placeholder for the Overview widgets. No fake numbers (design-system.md 6.7).
 * `busy` is false when it stands in as the static structure inside Overview.
 */
export function OverviewSkeleton({ busy = true }: { busy?: boolean }) {
  return (
    <>
      {busy ? <PageToolbarSkeleton label="Loading controls" className="max-md:hidden" /> : null}
      <div
        {...(busy ? { "aria-busy": true } : {})}
        className={cn("flex flex-col gap-[var(--gap)]")}
        data-slot="overview-skeleton"
      >
        {busy ? <span className="sr-only">Loading dashboard</span> : null}
        <div className="grid grid-cols-2 gap-[var(--gap)] md:grid-cols-4">
          <Tile />
          <Tile />
          <Tile />
          <Tile />
        </div>
        <div className="rounded-sheet layer-card p-[var(--pad-card)]">
          <Skeleton className="mb-3 h-4 w-40" />
          <Skeleton className="aspect-video w-full" />
        </div>
        <div className="flex flex-col gap-3 rounded-sheet layer-card p-[var(--pad-card)]">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}
