"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/components/cn";
import { isSimulated, useLiveState, useLiveVM } from "@/features/live/LiveProvider";
import { whatChanged as whatChangedOf } from "@/features/live/selectors";
import { PaletteButton } from "@/features/palette/PaletteButton";
import { Eyebrow } from "@/components/Eyebrow";
import { ChevronRight, ICON_STROKE, Sparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAssistantRail, useFocusRequest, usePanelEscape } from "@/features/shell/railState";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/useMediaQuery";
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
  const whatChanged = useLiveVM(context.whatChanged, whatChangedOf);
  const shown = { ...context, whatChanged };
  // The draft and where a prefilled question came from live in the machine's provider, so closing the phone
  // sheet does not lose what was typed.
  const { draft, setDraft, pending, setPending } = machine;
  const ref = useRef<HTMLTextAreaElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { request, consume } = useAskWhyRequest();
  const { collapse } = useAssistantRail();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const panelRef = useRef<HTMLDivElement>(null);
  // Docked from 1024 px, never a modal over the dashboard, so Tab is not trapped: Escape still collapses it.
  const onKeyDown = usePanelEscape({ desktop, collapse });

  const { answers, stop, retry, isStreaming, submitCount, bumpSubmit } = machine;
  const coarse = useMediaQuery(COARSE_QUERY);

  /** `about` is the entry point a question came from; without one the question is about the view in the URL. */
  function submit(question: string, about?: AskContext, { keepKeyboardDown = false } = {}) {
    onSubmit?.(question);
    machine.submit(question, about);
    // Focus stays in the textarea after Send (also when Send was clicked or a suggestion was picked), except that
    // picking a suggestion on a touch screen must not raise the keyboard over the answer. The panel is in view (it is
    // sticky), so moving focus must never scroll the page: Chrome otherwise scrolls a sticky field "into view".
    if (!(keepKeyboardDown && coarse)) ref.current?.focus({ preventScroll: true });
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
    ref.current?.focus({ preventScroll: true });
  }

  return (
    <div
      ref={panelRef}
      id="assistant-panel"
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex flex-col gap-4 p-[var(--pad-card)]",
        sheet
          ? // The answer list's bottom fade ends in the panel's own background.
            "h-full min-h-0 bg-surface-overlay [--panel-bg:var(--surface-overlay)]"
          : [
              "rounded-sheet layer-raised",
              // From 1024 px the panel is sticky in its column. ShellGrid's data-panel hides it once closed, after
              // its exit animation (globals.css).
              "lg:sticky lg:max-h-[calc(100vh-var(--header-h)-32px)]",
              "lg:top-[var(--assistant-top)]",
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
            Every answer cites its source.
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
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
      {/* Phone sheet only: the desktop entry point is the page header's search button. */}
      <div className="absolute top-[var(--pad-card)] right-[var(--pad-card)] lg:hidden">
        <PaletteButton />
      </div>
      <AnswerList
        answers={answers}
        context={pending ? { ...shown, about: null } : shown}
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
