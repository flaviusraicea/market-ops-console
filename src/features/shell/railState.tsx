"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { Mode } from "@/domain";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useConsoleContext } from "@/lib/context/useConsoleContext";

const STORAGE_KEY = "market-ops:assistant:v1";
/** Overview opens with the assistant; Analyst starts with the rail collapsed. */
const DEFAULTS: Record<Mode, boolean> = { overview: true, analyst: false };

const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function parse(raw: string | null): Record<Mode, boolean> {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (value && typeof value === "object") {
      const o = value as Record<string, unknown>;
      return {
        overview: typeof o["overview"] === "boolean" ? o["overview"] : DEFAULTS.overview,
        analyst: typeof o["analyst"] === "boolean" ? o["analyst"] : DEFAULTS.analyst,
      };
    }
  } catch {
    // A corrupt value falls back to the defaults.
  }
  return DEFAULTS;
}

function write(mode: Mode, open: boolean) {
  const next = { ...parse(readRaw()), [mode]: open };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked; the choice then lasts until the next load.
  }
  listeners.forEach((l) => l());
}

type FocusRequest = { target: "heading" | "rail"; nonce: number };

type RailValue = {
  /** Whether the assistant panel is open in this mode (desktop only; below 1024 px the panel is always in the page). */
  open: boolean;
  /** Answers that finished while collapsed. */
  unread: number;
  /** The rail toggle: open and move focus to the panel heading. */
  openFromRail: () => void;
  /** Open for an entry point such as Ask why; the panel moves focus to the composer itself. */
  openForEntry: () => void;
  /** Keep the assistant open in another mode, for a link that switches mode from inside the panel. */
  openIn: (mode: Mode) => void;
  /** Collapse and return focus to the rail toggle. */
  collapse: () => void;
  /** An answer finished; counts as unread when the panel is collapsed. */
  noteAnswerDone: () => void;
  focusRequest: FocusRequest | null;
  /** The always-mounted live region. undefined without a provider, null until it mounts. */
  liveHost: HTMLElement | null | undefined;
  setLiveHost: (el: HTMLElement | null) => void;
};

const NOOP: RailValue = {
  open: true,
  unread: 0,
  openFromRail: () => {},
  openForEntry: () => {},
  openIn: () => {},
  collapse: () => {},
  noteAnswerDone: () => {},
  focusRequest: null,
  liveHost: undefined,
  setLiveHost: () => {},
};

const RailContext = createContext<RailValue>(NOOP);

/** Whether the assistant is open, per mode, remembered in localStorage. Mounted once in Layout. */
export function AssistantRailProvider({ children }: { children: ReactNode }) {
  const { ctx } = useConsoleContext();
  const mode = ctx.mode;
  // Below 1024 px the panel is always in the page: nothing is collapsed, so nothing is unread or remembered.
  const desktop = useMediaQuery("(min-width: 1024px)");
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  const open = parse(raw)[mode];
  const [unread, setUnread] = useState(0);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const [liveHost, setLiveHost] = useState<HTMLElement | null>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      write(mode, next);
      if (next) setUnread(0);
    },
    [mode],
  );
  const requestFocus = useCallback(
    (target: FocusRequest["target"]) =>
      setFocusRequest((prev) => ({ target, nonce: (prev?.nonce ?? 0) + 1 })),
    [],
  );
  const openFromRail = useCallback(() => {
    setOpen(true);
    requestFocus("heading");
  }, [setOpen, requestFocus]);
  const openForEntry = useCallback(() => {
    if (desktop) setOpen(true);
  }, [desktop, setOpen]);
  const openIn = useCallback(
    (target: Mode) => {
      if (desktop) write(target, true);
    },
    [desktop],
  );
  const collapse = useCallback(() => {
    setOpen(false);
    requestFocus("rail");
  }, [setOpen, requestFocus]);
  const noteAnswerDone = useCallback(() => {
    if (desktop && !open) setUnread((n) => n + 1);
  }, [desktop, open]);

  const value = useMemo<RailValue>(
    () => ({
      open,
      unread,
      openFromRail,
      openForEntry,
      openIn,
      collapse,
      noteAnswerDone,
      focusRequest,
      liveHost,
      setLiveHost,
    }),
    [
      open,
      unread,
      openFromRail,
      openForEntry,
      openIn,
      collapse,
      noteAnswerDone,
      focusRequest,
      liveHost,
    ],
  );
  return <RailContext.Provider value={value}>{children}</RailContext.Provider>;
}

export function useAssistantRail(): RailValue {
  return useContext(RailContext);
}
