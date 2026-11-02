"use client";

import * as React from "react";
import { cn } from "@/components/cn";
import { Label as LabelPrimitive } from "radix-ui";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium text-ink select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:text-ink-disabled peer-disabled:cursor-not-allowed peer-disabled:text-ink-disabled",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
