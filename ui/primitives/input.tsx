import * as React from "react";

import { cn } from "@/ui/utils";

// Form field control: docs/design-system.md section 6.13. Focus ring is the global :focus-visible rule.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--control-h)] w-full min-w-0 rounded-control border border-border bg-surface px-2.5 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink outline-none transition-colors duration-[var(--dur-fast)] placeholder:text-ink-muted disabled:pointer-events-none disabled:bg-surface-2 disabled:text-ink-disabled",
        "aria-invalid:border-bad-mark",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
