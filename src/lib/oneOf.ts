/** `v` if it is one of `values`, else null. The one place a string is narrowed to a union. */
export const oneOf = <T extends string>(
  values: readonly T[],
  v: string | null | undefined,
): T | null => ((values as readonly string[]).includes(v ?? "") ? (v as T) : null);
