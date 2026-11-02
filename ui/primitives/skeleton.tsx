import { cn } from "@/ui/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("skeleton rounded-[4px] bg-surface-2", className)}
      {...props}
    />
  );
}

export { Skeleton };
