"use client";

import { cn } from "@/components/cn";
import { formatPeriod } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PeriodSelect({
  period,
  periods,
  onChange,
  className,
}: {
  period: string;
  periods: readonly string[];
  onChange: (p: string) => void;
  className?: string;
}) {
  const newestFirst = [...periods].reverse();
  return (
    <Select value={period} onValueChange={onChange}>
      <SelectTrigger aria-label="Period" className={cn("min-w-[120px]", className)}>
        <SelectValue />
      </SelectTrigger>
      {/* The menu belongs to the toolbar control that opened it, so it keeps the chrome scale. */}
      <SelectContent data-chrome="">
        {newestFirst.map((p) => (
          <SelectItem key={p} value={p}>
            {formatPeriod(p)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
