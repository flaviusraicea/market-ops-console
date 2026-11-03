"use client";

import { cn } from "@/components/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all";

export type ProductOption = { id: string; name: string };

/** Header: shown only when a market is selected. Analyst toolbar: always shown, disabled without a market. Choosing "All products" clears the product. */
export function ProductSelect({
  product,
  products,
  onChange,
  disabled = false,
  className,
}: {
  product: string | undefined;
  products: readonly ProductOption[];
  onChange: (product: string | undefined) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      value={product ?? ALL}
      disabled={disabled}
      onValueChange={(v) => onChange(v === ALL ? undefined : v)}
    >
      <SelectTrigger aria-label="Product" className={cn("min-w-[136px]", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All products</SelectItem>
        {products.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
