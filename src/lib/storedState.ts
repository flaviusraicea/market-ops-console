export type StoredState = {
  /** For `useSyncExternalStore`. Also fires on `storage` events, so other tabs stay in step. */
  subscribe: (onChange: () => void) => () => void;
  /** The raw stored string, or null when nothing is stored or storage is blocked. */
  read: () => string | null;
  /** Stores `value` and tells every subscriber. A blocked write still notifies, so the choice lasts until reload. */
  write: (value: string) => void;
};

/** A browser-storage value as an external store. The raw string is the snapshot, so it is stable between reads. */
export function createStoredState(key: string, area: "local" | "session"): StoredState {
  const listeners = new Set<() => void>();
  const storage = () => (area === "local" ? window.localStorage : window.sessionStorage);
  return {
    subscribe(onChange) {
      listeners.add(onChange);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    read() {
      try {
        return storage().getItem(key);
      } catch {
        return null;
      }
    },
    write(value) {
      try {
        storage().setItem(key, value);
      } catch {
        // Storage can be blocked; remembering is a convenience.
      }
      listeners.forEach((l) => l());
    },
  };
}
