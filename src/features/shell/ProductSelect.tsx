"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all";

export type ProductOption = { id: string; name: string };

/** Shown only when a market is selected. Choosing "All products" clears the product. */
export function ProductSelect({
  product,
  products,
  onChange,
}: {
  product: string | undefined;
  products: readonly ProductOption[];
  onChange: (product: string | undefined) => void;
}) {
  return (
    <Select value={product ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger aria-label="Product" className="min-w-[148px]">
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
