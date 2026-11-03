import { cn } from "@/components/cn";
import { Skeleton } from "@/components/ui/skeleton";

/** Stands in for `PageToolbar` while the page streams: the same sticky slot and heights, so the swap moves nothing. */
export function PageToolbarSkeleton({ label, className }: { label: string; className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        "sticky top-[var(--header-h)] z-20 mb-[var(--gap-section)] flex h-10 items-center border-b border-border bg-bg shadow-toolbar pointer-coarse:h-12",
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <Skeleton aria-hidden className="h-4 w-64" />
    </div>
  );
}
