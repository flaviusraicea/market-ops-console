// Zod-free so the URL layer can validate a region id in the browser without pulling in the schema library.
export const REGION_IDS = ["na", "eu", "apac", "latam"] as const;

export function isRegionId(value: unknown): value is (typeof REGION_IDS)[number] {
  return typeof value === "string" && (REGION_IDS as readonly string[]).includes(value);
}
