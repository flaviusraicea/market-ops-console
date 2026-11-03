import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The elevation shadows are custom theme values; without them tailwind-merge reads `shadow-card` as a colour.
const twMerge = extendTailwindMerge({
  extend: { theme: { shadow: ["card", "raised", "overlay", "header", "toolbar", "basin"] } },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
