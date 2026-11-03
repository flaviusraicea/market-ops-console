"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { Eyebrow } from "@/components/Eyebrow";
import {
  Activity,
  AppWindow,
  Globe,
  ICON_STROKE,
  MapPin,
  Package,
  Search,
  Sparkles,
  SunMoon,
} from "@/components/icons";
import { Command, CommandDialog } from "@/components/ui/command";
import type { Mode } from "@/domain";
import { useDataset } from "@/lib/context/dataset";
import {
  buildGroups,
  filterGroups,
  type PaletteAction,
  type PaletteIcon,
  type PaletteItem,
} from "./items";

const ICONS: Record<PaletteIcon, typeof Search> = {
  market: MapPin,
  region: Globe,
  product: Package,
  view: AppWindow,
  ask: Sparkles,
  theme: SunMoon,
  motion: Activity,
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after the palette has closed and focus has settled, so the action may move focus itself. */
  onSelect: (action: PaletteAction) => void;
  /** Called when the palette is dismissed without choosing, so focus can go back to what opened it. */
  onDismiss: () => void;
  mode: Mode;
  hasMarket: boolean;
  reducedMotion: boolean;
};

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[4px] border border-border bg-surface px-1 font-sans text-[length:var(--text-caption)] leading-4 text-ink-2">
      {children}
    </kbd>
  );
}

/**
 * Jump-anywhere palette (cmdk in a Radix dialog). Filtering happens in `filterGroups`, so every group
 * heading can show its own count. From 1024 px down it is a full-height sheet from the top.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onSelect,
  onDismiss,
  mode,
  hasMarket,
  reducedMotion,
}: CommandPaletteProps) {
  const ds = useDataset();
  const [query, setQuery] = useState("");
  const pending = useRef<PaletteAction | null>(null);

  const groups = useMemo(
    () => filterGroups(buildGroups(ds, { mode, hasMarket, reducedMotion }), query),
    [ds, mode, hasMarket, reducedMotion, query],
  );

  function choose(item: PaletteItem) {
    pending.current = item.action;
    onOpenChange(false);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command palette"
      description="Go to a market or region, switch view, ask the assistant, or change the theme."
      onCloseAutoFocus={(event) => {
        // Choosing something hands focus to the action; dismissing returns it to the opener.
        const action = pending.current;
        pending.current = null;
        setQuery("");
        event.preventDefault();
        if (action) onSelect(action);
        else onDismiss();
      }}
    >
      <Command
        shouldFilter={false}
        label="Command palette"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search aria-hidden className="size-4 shrink-0 text-ink-2" strokeWidth={ICON_STROKE} />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder="Go to a market, switch view, or ask…"
            className="h-12 min-w-0 flex-1 bg-transparent px-2 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        <Command.List className="max-h-[min(440px,calc(100dvh-104px-96px))] min-h-0 flex-1 overflow-y-auto p-2 max-lg:max-h-none">
          {groups.map((group) => (
            <Command.Group
              key={group.id}
              heading={
                <Eyebrow className="flex items-center justify-between">
                  <span>{group.heading}</span>
                  <span className="num">{group.items.length}</span>
                </Eyebrow>
              }
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1"
            >
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                return (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => choose(item)}
                    className="flex min-h-10 cursor-default items-center gap-3 rounded-control px-2 text-[length:var(--text-body)] leading-[var(--text-body-lh)] text-ink data-[selected=true]:bg-accent-soft"
                  >
                    <Icon
                      aria-hidden
                      className="size-4 shrink-0 text-ink-2"
                      strokeWidth={ICON_STROKE}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.meta ? (
                      <span
                        className={cn(
                          "shrink-0 text-[length:var(--text-label)] leading-[var(--text-label-lh)]",
                          item.icon === "market" ? "text-accent" : "text-ink-2",
                        )}
                      >
                        {item.meta}
                      </span>
                    ) : null}
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>
        <div className="flex items-center justify-between gap-4 border-t border-border bg-surface-2 px-4 py-2.5 text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-2">
          <span className="flex items-center gap-3 max-lg:hidden" aria-hidden>
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> select
            </span>
            <span className="flex items-center gap-1">
              <Kbd>esc</Kbd> close
            </span>
          </span>
          <span className="flex items-center gap-1.5 max-lg:hidden" aria-hidden>
            Command palette · <Kbd>⌘K</Kbd>
          </span>
        </div>
      </Command>
    </CommandDialog>
  );
}
