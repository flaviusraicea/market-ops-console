import type { Mode } from "./dataset";

/** Whether the assistant is open, per mode. Executive opens with it; Analyst starts with the rail collapsed. */
export type AssistantPrefs = Record<Mode, boolean>;
export const DEFAULT_PREFS: AssistantPrefs = { executive: true, analyst: false };

/** Reads the stored JSON. A missing or malformed field falls back to its default; a corrupt value gives the defaults. */
export function parsePrefs(raw: string | null): AssistantPrefs {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return DEFAULT_PREFS;
    const stored = parsed as Record<string, unknown>;
    const field = (key: Mode) => {
      const v = stored[key];
      return typeof v === "boolean" ? v : DEFAULT_PREFS[key];
    };
    return { executive: field("executive"), analyst: field("analyst") };
  } catch {
    return DEFAULT_PREFS;
  }
}
