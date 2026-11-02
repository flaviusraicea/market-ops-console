import * as React from "react";

import { cn } from "@/components/cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[var(--control-h)] w-full rounded-control border border-border bg-surface px-2.5 py-1.5 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink outline-none transition-colors duration-[var(--dur-fast)] placeholder:text-ink-muted disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-disabled aria-invalid:border-bad-mark",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
