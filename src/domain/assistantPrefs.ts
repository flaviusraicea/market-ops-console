import { z } from "zod";

import type { Mode } from "./dataset";

/** Whether the assistant is open, per mode. Overview opens with it; Analyst starts with the rail collapsed. */
export type AssistantPrefs = Record<Mode, boolean>;
export const DEFAULT_PREFS: AssistantPrefs = { overview: true, analyst: false };

// A missing or malformed field falls back to its default.
const PrefsSchema = z.object({
  overview: z.boolean().catch(DEFAULT_PREFS.overview),
  analyst: z.boolean().catch(DEFAULT_PREFS.analyst),
});

/** Reads the stored JSON. A corrupt value gives the defaults. */
export function parsePrefs(raw: string | null): AssistantPrefs {
  try {
    const parsed = PrefsSchema.safeParse(raw ? JSON.parse(raw) : {});
    return parsed.success ? parsed.data : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}
