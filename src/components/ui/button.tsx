import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/components/cn";

// Variants follow docs/design-system.md section 6.11.
const buttonVariants = cva(
  "press inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control px-3 text-[length:var(--text-label)] leading-[var(--text-label-lh)] font-medium transition-colors duration-[var(--dur-fast)] outline-none disabled:pointer-events-none disabled:bg-surface-2 disabled:text-ink-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        primary: "bg-accent text-on-accent hover:bg-accent-hover",
        // Disabled secondary and ghost read as an outline, not a filled bar; the
        // utilities are in globals.css.
        secondary: "border border-border bg-surface text-ink hover:bg-surface-2 disabled:btn-off",
        ghost: "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink disabled:btn-off-ring",
        danger: "bg-bad-mark text-on-bad hover:bg-bad-hover",
      },
      size: {
        default: "h-[var(--control-h)]",
        // The chip height: for a control that sits inside a row of text-sized parts, such as a card header.
        sm: "h-[var(--chip-h)] px-2",
        icon: "size-[var(--control-h)] px-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
