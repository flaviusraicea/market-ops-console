"use client";

import { useRef, type Ref } from "react";

import { ChevronLeft, ICON_STROKE, Sparkles } from "@/components/icons";
import { Eyebrow } from "@/components/Eyebrow";
import { cn } from "@/components/cn";
import { PaletteButton } from "@/features/palette/PaletteButton";
import { useAssistantRail, useFocusRequest } from "./railState";

type AssistantRailProps = {
  open?: boolean;
  unread?: number;
  onToggle: () => void;
  toggleRef?: Ref<HTMLButtonElement>;
  className?: string;
};

/**
 * The collapsed assistant: a 48 px strip beside the dashboard. The whole strip is one toggle, so the
 * vertical label is as easy to hit as the chevron. Desktop only; the layout hides it below 1024 px.
 */
export function AssistantRail({
  open = false,
  unread = 0,
  onToggle,
  toggleRef,
  className,
}: AssistantRailProps) {
  return (
    <div
      className={cn(
        "relative flex h-fit w-12 flex-col items-center rounded-sheet layer-card",
        className,
      )}
    >
      <button
        ref={toggleRef}
        type="button"
        id="assistant-toggle"
        aria-expanded={open}
        aria-controls="assistant-panel"
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={onToggle}
        className="absolute inset-0 rounded-sheet hover:bg-surface-2"
      />
      <div className="pointer-events-none relative flex flex-col items-center gap-3 py-3 text-ai-label">
        <ChevronLeft aria-hidden className="size-4 text-ink-muted" strokeWidth={ICON_STROKE} />
        <Sparkles aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
        <Eyebrow className="text-ai-label [writing-mode:vertical-rl]">Assistant</Eyebrow>
        {unread > 0 ? (
          <span
            role="img"
            aria-label={unread === 1 ? "1 new answer" : `${unread} new answers`}
            className="grid size-[18px] place-items-center rounded-pill bg-accent text-[length:var(--text-caption)] leading-none font-semibold text-on-accent"
          >
            {unread}
          </span>
        ) : null}
      </div>
      {/* Above the strip-wide toggle so it takes its own clicks. */}
      <div className="relative pb-2">
        <PaletteButton side="left" />
      </div>
    </div>
  );
}

/** The rail wired to the shell's state. Takes focus back when the panel collapses. */
export function ConnectedAssistantRail() {
  const { open, unread, openFromRail, collapse } = useAssistantRail();
  const toggle = useRef<HTMLButtonElement>(null);
  useFocusRequest("rail", toggle);
  return (
    <div
      // Visible from 1024 px; at 1280 px and up the open panel takes the whole column instead.
      className={cn("sticky top-[var(--assistant-top)] hidden lg:block", open && "xl:hidden")}
    >
      <AssistantRail
        open={open}
        unread={unread}
        toggleRef={toggle}
        onToggle={open ? collapse : openFromRail}
      />
    </div>
  );
}
