import { z } from "zod";

import type { Mode } from "./dataset";

/** Whether the assistant is open, per mode. Executive opens with it; Analyst starts with the rail collapsed. */
export type AssistantPrefs = Record<Mode, boolean>;
export const DEFAULT_PREFS: AssistantPrefs = { executive: true, analyst: false };

// A missing or malformed field falls back to its default.
const PrefsSchema = z.object({
  executive: z.boolean().catch(DEFAULT_PREFS.executive),
  analyst: z.boolean().catch(DEFAULT_PREFS.analyst),
});

/** Reads the stored JSON. A corrupt value gives the defaults. */
export function parsePrefs(raw: string | null): AssistantPrefs {
  try {
    const stored: unknown = raw ? JSON.parse(raw) : {};
    // Before the mode was renamed the Executive preference was stored as "overview".
    const migrated =
      stored && typeof stored === "object" && "overview" in stored && !("executive" in stored)
        ? { ...stored, executive: stored.overview }
        : stored;
    const parsed = PrefsSchema.safeParse(migrated);
    return parsed.success ? parsed.data : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}
