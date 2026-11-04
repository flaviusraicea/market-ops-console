/** Where the alert rules live in localStorage. Its own module so the folded Alerts row can read it cheaply. */
export const STORAGE_KEY = "market-ops:alerts:v1";

/** Fired on window when this tab writes the rules; the storage event only reaches other tabs. */
export const RULES_CHANGED = "market-ops:alerts-changed";
