"use client";

import {
  createContext,
  useCallback,
  useRef,
  type KeyboardEvent,
  useContext,
  useMemo,
  useState,
  useEffect,
  useSyncExternalStore,
  type RefObject,
  type ReactNode,
} from "react";

import { parsePrefs, type Mode } from "@/domain";

import { createStoredState } from "@/lib/storedState";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { useConsoleContext } from "@/lib/context/useConsoleContext";

const STORAGE_KEY = "market-ops:assistant:v1";
const stored = createStoredState(STORAGE_KEY, "local");

function write(mode: Mode, open: boolean) {
  stored.write(JSON.stringify({ ...parsePrefs(stored.read()), [mode]: open }));
}

export type FocusRequest = { target: "heading" | "rail"; nonce: number };

type RailValue = {
  /** Whether the panel is open in this mode. Desktop only: below 1024 px the panel is always in the page. */
  open: boolean;
  unread: number;
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
  /** The always-mounted live region: undefined without a provider, null until it mounts. */
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
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const raw = useSyncExternalStore(stored.subscribe, stored.read, () => null);
  const open = parsePrefs(raw)[mode];
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

/** Focuses `el` once per new request for `target`; a request made before this component mounted is ignored. */
export function useFocusRequest(target: FocusRequest["target"], el: RefObject<HTMLElement | null>) {
  const { focusRequest } = useAssistantRail();
  const handled = useRef(focusRequest?.nonce);
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === handled.current) return;
    handled.current = focusRequest.nonce;
    if (focusRequest.target === target) el.current?.focus();
  }, [focusRequest, target, el]);
}

/**
 * The overlay behaviour of the open panel: Escape collapses it, and while it overlays the dashboard
 * (1024 to 1279 px) Tab wraps inside it. Attach the returned handler to the panel.
 */
export function useOverlayKeys(
  panelRef: RefObject<HTMLElement | null>,
  { desktop, overlay, collapse }: { desktop: boolean; overlay: boolean; collapse: () => void },
) {
  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (!desktop) return;
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        collapse();
        return;
      }
      if (e.key !== "Tab" || !overlay || !panelRef.current) return;
      const items = [
        ...panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([readonly]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((el) => el.offsetParent !== null);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [panelRef, desktop, overlay, collapse],
  );
}
