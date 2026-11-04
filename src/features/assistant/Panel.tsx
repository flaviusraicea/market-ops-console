"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { isSimulated, useLiveState } from "@/features/live/LiveProvider";
import { PaletteButton } from "@/features/palette/PaletteButton";
import { Eyebrow } from "@/components/Eyebrow";
import { ChevronRight, ICON_STROKE, Sparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAssistantRail, useFocusRequest, useOverlayKeys } from "@/features/shell/railState";
import { DESKTOP_QUERY, OVERLAY_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
import { COARSE_QUERY } from "@/lib/useMediaQuery";
import { AnswerList } from "./AnswerList";
import { useAskWhyRequest, type AskContext } from "./askWhy";
import { useAnswerMachineContext } from "./AnswerMachine";
import { Composer } from "./Composer";
import type { PanelContext } from "./EmptyState";

type PanelProps = {
  /** What the empty state says about the current view. */
  context: PanelContext;
  onSubmit?: (question: string) => void;
};

/**
 * The assistant panel: composer at the top, then the answers. It reads the session's answer machine, so closing
 * or remounting it never loses a stream. From 1024 px it is a sticky column; below that it fills a bottom sheet.
 */
type Placement = {
  /** `sheet` is the phone layout: the panel fills the bottom sheet instead of sitting in a column. */
  variant: "column" | "sheet";
  /**
   * Whether opening the sheet moves focus to the composer. It does when the person tapped "Ask the assistant";
   * it does not when an Ask why button or a citation opened it, because that would raise the keyboard.
   */
  focusComposer: boolean;
};
const PlacementContext = createContext<Placement>({
  variant: "column",
  focusComposer: true,
});

/** Wraps the panel where it is not in the desktop column. */
export function PanelPlacement({ value, children }: { value: Placement; children: ReactNode }) {
  return <PlacementContext.Provider value={value}>{children}</PlacementContext.Provider>;
}

/** The panel reads the session's answer machine, so it must sit under `AnswerMachineProvider` (Layout provides it). */
export function Panel(props: PanelProps) {
  const machine = useAnswerMachineContext();
  if (!machine) throw new Error("Panel must be rendered inside AnswerMachineProvider");
  return <PanelBody {...props} machine={machine} />;
}

function PanelBody({
  context,
  onSubmit,
  machine,
}: PanelProps & { machine: NonNullable<ReturnType<typeof useAnswerMachineContext>> }) {
  const { variant, focusComposer } = useContext(PlacementContext);
  const sheet = variant === "sheet";
  const live = useLiveState();
  // The draft and where a prefilled question came from live in the machine's provider, so closing the phone
  // sheet does not lose what was typed.
  const { draft, setDraft, pending, setPending } = machine;
  const ref = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { request, consume } = useAskWhyRequest();
  const { open, collapse } = useAssistantRail();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const overlay = useMediaQuery(OVERLAY_QUERY) && open;
  const panelRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useOverlayKeys(panelRef, { desktop, overlay, collapse });

  const { answers, stop, retry, isStreaming, submitCount, bumpSubmit } = machine;
  const coarse = useMediaQuery(COARSE_QUERY);

  /** `about` is the entry point a question came from; without one the question is about the view in the URL. */
  function submit(question: string, about?: AskContext, { keepKeyboardDown = false } = {}) {
    onSubmit?.(question);
    machine.submit(question, about);
    // Focus stays in the textarea after Send (also when Send was clicked or a suggestion was picked), except that
    // picking a suggestion on a touch screen must not raise the keyboard over the answer.
    if (!(keepKeyboardDown && coarse)) ref.current?.focus();
  }

  // An "Ask why" button elsewhere either fills the composer or has sent its question already (see AnswerMachine).
  useEffect(() => {
    if (!request || !consume(request.nonce)) return;
    if (request.fill) {
      setDraft(request.text);
      setPending(
        request.ctx
          ? {
              ctx: request.ctx,
              note: request.from ? `Filled from ${request.from}. Edit, then press Enter.` : null,
            }
          : null,
      );
    }
    if (!(sheet && !focusComposer)) ref.current?.focus();
  }, [request, consume, setDraft, setPending, sheet, focusComposer]);
  // The sheet opened by "Ask the assistant" puts the cursor in the composer.
  useEffect(() => {
    if (sheet && focusComposer) ref.current?.focus();
  }, [sheet, focusComposer]);

  // Opening from the rail toggle lands on the panel heading; entry points land in the composer (above).
  useFocusRequest("heading", headingRef);

  // The Try button on an abstain card fills the composer like "Ask why" does, and leaves sending to the user.
  function fill(text: string) {
    setDraft(text);
    setPending(null);
    ref.current?.focus();
  }

  return (
    <div
      ref={panelRef}
      id="assistant-panel"
      {...(overlay ? { role: "dialog", "aria-modal": true, "aria-labelledby": "assistant-h" } : {})}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex flex-col gap-4 p-[var(--pad-card)]",
        sheet
          ? "h-full min-h-0 bg-surface-overlay"
          : [
              "panel-enter rounded-sheet layer-raised",
              // From 1280 px the panel is sticky in its column; from 1024 to 1279 px it overlays the dashboard when open.
              "xl:sticky xl:max-h-[calc(100vh-var(--header-h)-32px)]",
              "xl:top-[var(--assistant-top)]",
              "lg:max-xl:fixed lg:max-xl:top-[var(--below-header)] lg:max-xl:right-4 lg:max-xl:bottom-4 lg:max-xl:z-50 lg:max-xl:w-[var(--assistant-w)] lg:max-xl:shadow-overlay",
              !open && "lg:hidden",
            ],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1 pr-[var(--control-h)] lg:pr-0">
          <h2
            id="assistant-h"
            ref={headingRef}
            tabIndex={-1}
            className="w-fit rounded-control outline-offset-2"
          >
            <Eyebrow className="inline-flex items-center gap-1.5 text-ai-label">
              <Sparkles aria-hidden className="size-3.5" strokeWidth={ICON_STROKE} />
              Assistant
            </Eyebrow>
          </h2>
          <span className="text-[length:var(--text-label)] leading-[var(--text-label-lh)] text-ink-muted">
            Answers are AI-generated. Numbers link to source.
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Collapse assistant"
          aria-controls="assistant-panel"
          aria-expanded
          onClick={collapse}
          className="max-lg:hidden"
        >
          <ChevronRight aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
        </Button>
      </div>
      <Composer
        value={draft}
        onChange={(v) => {
          setDraft(v);
          // Editing the filled text drops the "Filled from" line; the About chip stays until sent or cleared.
          setPending((p) => (p?.note ? { ...p, note: null } : p));
        }}
        onSubmit={(q) => {
          // Sending the composer text uses up the context a prefill gave it; a sent Ask why leaves the draft alone.
          submit(q, pending?.ctx);
          setPending(null);
        }}
        disabled={isStreaming}
        textareaRef={ref}
        about={pending?.ctx.label ?? null}
        onClearAbout={() => setPending(null)}
        note={pending?.note ?? null}
        simulated={isSimulated(live)}
      />
      {/* After the composer in the DOM so the composer stays first in tab order; placed top right. */}
      <div className="absolute top-[var(--pad-card)] right-[var(--pad-card)] lg:right-[calc(var(--pad-card)+var(--control-h)+8px)]">
        <PaletteButton />
      </div>
      <AnswerList
        answers={answers}
        context={pending ? { ...context, about: null } : context}
        onPick={(q) => submit(q, undefined, { keepKeyboardDown: true })}
        onTry={fill}
        onStop={stop}
        onRetry={(id) => {
          retry(id);
          bumpSubmit();
        }}
        scrollSignal={submitCount}
      />
    </div>
  );
}
