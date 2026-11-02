"use client";

import { formatPeriod } from "@/lib/format/number";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/primitives/select";

export function PeriodSelect({
  period,
  periods,
  onChange,
}: {
  period: string;
  periods: readonly string[];
  onChange: (p: string) => void;
}) {
  const newestFirst = [...periods].reverse();
  return (
    <Select value={period} onValueChange={onChange}>
      <SelectTrigger aria-label="Period" className="min-w-[132px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {newestFirst.map((p) => (
          <SelectItem key={p} value={p}>
            {formatPeriod(p)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
