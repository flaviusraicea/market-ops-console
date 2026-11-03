import { useId, type ReactNode, type Ref } from "react";

import { CardHeader } from "@/components/CardHeader";
import { cn } from "@/components/cn";

/** Card chrome shared by the analyst widgets: title left, provenance caption right. */
export function AnalystCard({
  title,
  subtitle,
  caption,
  className,
  children,
  landed = false,
  sectionRef,
}: {
  title: string;
  subtitle?: string;
  caption: string;
  className?: string;
  children: ReactNode;
  /** A followed citation points at this card: show the landing ring. */
  landed?: boolean;
  sectionRef?: Ref<HTMLElement>;
}) {
  const id = useId();
  return (
    <section
      ref={sectionRef}
      data-landed={landed ? "" : undefined}
      aria-labelledby={subtitle ? `${id} ${id}-sub` : id}
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-card border border-border bg-surface p-[var(--pad-card)]",
        className,
      )}
    >
      <CardHeader
        title={title}
        titleId={id}
        subtitleId={`${id}-sub`}
        caption={caption}
        {...(subtitle ? { subtitle } : {})}
      />
      {children}
    </section>
  );
}
