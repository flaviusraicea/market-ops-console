"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAskWhy } from "@/features/assistant/askWhy";
import { hrefFor } from "@/lib/context/href";
import { applyContextChange } from "@/lib/context/invariants";
import { useConsoleMeta } from "@/lib/context/meta";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { isMotionOverrideOn, toggleMotionOverride } from "@/lib/motion";
import { useTheme } from "@/lib/theme";
import type { PaletteAction } from "./items";

// The palette and cmdk stay out of the first bundle (the script budget counts every byte on load); the chunk loads
// when a modifier key goes down, just before the shortcut is complete.
const loadPalette = () => import("./CommandPalette").then((m) => m.CommandPalette);
const CommandPalette = dynamic(loadPalette, { ssr: false });

const PaletteContext = createContext<{ openPalette: () => void }>({ openPalette: () => {} });

export function usePalette() {
  return useContext(PaletteContext);
}

/** Moves focus to the dashboard once the new view has rendered: the verdict heading, else the main region. */
function focusDashboard() {
  const target = document.getElementById("verdict-h") ?? document.getElementById("main");
  target?.focus();
}

/** Mounted once in Layout: owns the ⌘K / Ctrl+K shortcut, the open state and what each choice does. */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { ctx, setContext, isPending } = useConsoleContext();
  const meta = useConsoleMeta();
  const { ask } = useAskWhy();
  const { resolved, setTheme } = useTheme();
  const [everOpened, setEverOpened] = useState(false);

  const opener = useRef<HTMLElement | null>(null);
  const isOpen = useRef(false);

  const changeOpen = useCallback((next: boolean) => {
    isOpen.current = next;
    setOpen(next);
  }, []);

  const openPalette = useCallback(() => {
    // Already open (for example ⌘K pressed inside it): keep the real opener.
    if (isOpen.current) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setReducedMotion(isMotionOverrideOn());
    setEverOpened(true);
    changeOpen(true);
  }, [changeOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // The modifier goes down a moment before K: start fetching the chunk and mount the palette closed, so the
      // open itself is not the first time it runs. Nothing loads for a visitor who never reaches for the shortcut.
      if (e.key === "Control" || e.key === "Meta") {
        void loadPalette();
        setEverOpened(true);
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openPalette]);

  // After a navigation the URL write runs in a transition; focus moves once it settles.
  const focusAfterNav = useRef(false);
  useEffect(() => {
    if (focusAfterNav.current && !isPending) {
      focusAfterNav.current = false;
      focusDashboard();
    }
  }, [isPending]);

  const navigate = useCallback(
    (patch: Parameters<typeof setContext>[0]) => {
      const change = applyContextChange(meta, ctx, patch);
      // A patch that changes nothing never starts a transition, so focus moves now instead of waiting for one.
      if (!change.ok || hrefFor(meta, change.next) === hrefFor(meta, ctx)) {
        focusDashboard();
        return;
      }
      focusAfterNav.current = true;
      setContext(patch);
    },
    [meta, ctx, setContext],
  );

  const onSelect = useCallback(
    (action: PaletteAction) => {
      switch (action.kind) {
        case "market":
          navigate({ market: action.marketId });
          break;
        case "region":
          navigate({ region: action.regionId, market: undefined });
          break;
        case "product":
          navigate({ product: action.productId });
          break;
        case "mode":
          navigate({ mode: action.mode });
          break;
        case "ask":
          ask(action.text);
          break;
        case "theme":
          setTheme(resolved === "light" ? "dark" : "light");
          break;
        case "motion":
          toggleMotionOverride();
          break;
      }
    },
    [ask, navigate, resolved, setTheme],
  );

  const value = useMemo(() => ({ openPalette }), [openPalette]);
  return (
    <PaletteContext.Provider value={value}>
      {children}
      {everOpened ? (
        <CommandPalette
          open={open}
          onOpenChange={changeOpen}
          onSelect={onSelect}
          onDismiss={() => opener.current?.focus()}
          mode={ctx.mode}
          hasMarket={Boolean(ctx.market)}
          reducedMotion={reducedMotion}
        />
      ) : null}
    </PaletteContext.Provider>
  );
}
