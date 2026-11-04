import { cn } from "@/components/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton rounded-mark bg-surface-2", className)}
      {...props}
    />
  );
}

export { Skeleton };
