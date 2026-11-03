import type { Mode } from "./dataset";

/** Whether the assistant is open, per mode. Overview opens with it; Analyst starts with the rail collapsed. */
export type AssistantPrefs = Record<Mode, boolean>;
export const DEFAULT_PREFS: AssistantPrefs = { overview: true, analyst: false };

/** Reads the stored JSON. A missing or malformed field falls back to its default; a corrupt value gives the defaults. */
export function parsePrefs(raw: string | null): AssistantPrefs {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      return DEFAULT_PREFS;
    const field = (key: Mode) => {
      const v = (parsed as Record<string, unknown>)[key];
      return typeof v === "boolean" ? v : DEFAULT_PREFS[key];
    };
    return { overview: field("overview"), analyst: field("analyst") };
  } catch {
    return DEFAULT_PREFS;
  }
}
