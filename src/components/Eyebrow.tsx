import type { ElementType, ReactNode } from "react";

import { cn } from "@/components/cn";

/** Eyebrow type style (design-system 4.1 rule 2): never wraps. Colour is left to the caller. */
export const EYEBROW_CLASS =
  "text-[length:var(--text-caption)] leading-[var(--text-caption-lh)] font-semibold tracking-[var(--text-caption-ls)] whitespace-nowrap";

/** The one eyebrow. Uppercase by default; an overflowing eyebrow is a bug to shorten, not to wrap. */
export function Eyebrow({
  children,
  as,
  className,
  id,
  title,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  id?: string;
  title?: string;
}) {
  const Tag: ElementType = as ?? "span";
  return (
    <Tag id={id} title={title} className={cn(EYEBROW_CLASS, "text-ink-muted uppercase", className)}>
      {children}
    </Tag>
  );
}
