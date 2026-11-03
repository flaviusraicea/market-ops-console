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
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useTheme } from "@/lib/theme";
import type { PaletteAction } from "./items";

// The palette and cmdk stay out of the first bundle; the chunk loads on first open.
const CommandPalette = dynamic(() => import("./CommandPalette").then((m) => m.CommandPalette), {
  ssr: false,
});

const PaletteContext = createContext<{ openPalette: () => void }>({ openPalette: () => {} });

export function usePalette() {
  return useContext(PaletteContext);
}

/** Moves focus to the dashboard once the new view has rendered: the verdict heading, else the main region. */
function focusDashboard() {
  const target = document.getElementById("verdict-h") ?? document.getElementById("main");
  target?.focus({ preventScroll: false });
}

/** Mounted once in Layout: owns the ⌘K / Ctrl+K shortcut, the open state and what each choice does. */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { ctx, setContext, isPending } = useConsoleContext();
  const { ask } = useAskWhy();
  const { resolved, setTheme } = useTheme();
  const [everOpened, setEverOpened] = useState(false);

  const opener = useRef<HTMLElement | null>(null);

  const openPalette = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setReducedMotion(document.documentElement.getAttribute("data-reduced-motion") === "true");
    setEverOpened(true);
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
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
      focusAfterNav.current = true;
      setContext(patch);
      // Selecting what is already selected writes nothing, so nothing will settle: move focus anyway.
      window.setTimeout(() => {
        if (focusAfterNav.current) {
          focusAfterNav.current = false;
          focusDashboard();
        }
      }, 400);
    },
    [setContext],
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
        case "motion": {
          const root = document.documentElement;
          if (root.getAttribute("data-reduced-motion") === "true")
            root.removeAttribute("data-reduced-motion");
          else root.setAttribute("data-reduced-motion", "true");
          break;
        }
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
          onOpenChange={setOpen}
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
