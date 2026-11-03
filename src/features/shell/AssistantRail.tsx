"use client";

import { useEffect, useRef } from "react";

import { ChevronLeft, ICON_STROKE, Sparkles } from "@/components/icons";
import { Eyebrow } from "@/components/Eyebrow";
import { cn } from "@/components/cn";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { useAssistantRail } from "./railState";

type AssistantRailProps = {
  /** Whether the panel is open. The toggle says so with `aria-expanded`. */
  open?: boolean;
  /** Answers that finished while the panel was collapsed. */
  unread?: number;
  onToggle: () => void;
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
  className,
}: AssistantRailProps) {
  return (
    <div
      className={cn(
        "relative flex h-fit w-12 flex-col items-center rounded-card border border-border bg-surface",
        className,
      )}
    >
      <button
        type="button"
        id="assistant-toggle"
        aria-expanded={open}
        aria-controls="assistant-panel"
        aria-label={open ? "Close assistant" : "Open assistant"}
        onClick={onToggle}
        className="absolute inset-0 rounded-card hover:bg-surface-2"
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
    </div>
  );
}

/** The rail wired to the shell's state. Takes focus back when the panel collapses. */
export function ConnectedAssistantRail() {
  const { open, unread, openFromRail, focusRequest } = useAssistantRail();
  const { ctx } = useConsoleContext();
  const ref = useRef<HTMLDivElement>(null);
  const handled = useRef(focusRequest?.nonce);
  useEffect(() => {
    if (!focusRequest || focusRequest.nonce === handled.current) return;
    handled.current = focusRequest.nonce;
    if (focusRequest.target === "rail") ref.current?.querySelector("button")?.focus();
  }, [focusRequest]);
  return (
    <div
      ref={ref}
      // Visible from 1024 px; at 1280 px and up the open panel takes the whole column instead.
      className={cn(
        "sticky hidden lg:block",
        ctx.mode === "analyst" ? "top-[calc(var(--header-h)+16px)]" : "top-4",
        open && "xl:hidden",
      )}
    >
      <AssistantRail open={open} unread={unread} onToggle={openFromRail} />
    </div>
  );
}
