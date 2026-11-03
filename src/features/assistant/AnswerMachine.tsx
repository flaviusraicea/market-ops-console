"use client";

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
import { createPortal } from "react-dom";

import { entityName, entityOf } from "@/domain";
import { useAssistantRail } from "@/features/shell/railState";
import { useDataset } from "@/lib/context/dataset";
import { useConsoleContext } from "@/lib/context/useConsoleContext";
import { logEvent } from "@/lib/events";
import type { AskStream } from "@/lib/stream/chatClient";
import { useRegisterAskSender, type AskContext } from "./askWhy";
import { usePublishAnswers } from "./AnswerStore";
import { askContext } from "./questions";
import { useAnswerMachine, type Answer } from "./useAnswerMachine";

type Machine = ReturnType<typeof useAnswerMachine>;

type MachineValue = Machine & {
  /** Sends a question about `about`, or about the view in the URL. */
  submit: (question: string, about?: AskContext) => void;
  /** Bumped on every question or retry, so the list can bring the newest card into view. */
  submitCount: number;
  bumpSubmit: () => void;
};

const MachineContext = createContext<MachineValue | null>(null);

const ANNOUNCEMENT: Partial<Record<Answer["status"], string>> = {
  done: "Answer complete",
  stopped: "Answer stopped",
  failed: "Answer failed",
};

/**
 * Owns the answers for the whole session. It lives in Layout, so a stream keeps running while the panel is
 * collapsed or the phone sheet is closed, and the end of an answer is announced and counted as unread either way.
 */
export function AnswerMachineProvider({
  children,
  stream,
}: {
  children: ReactNode;
  stream?: AskStream;
}) {
  const machine = useAnswerMachine(stream);
  usePublishAnswers(machine.answers);
  const ds = useDataset();
  const { ctx } = useConsoleContext();
  const { liveHost, noteAnswerDone } = useAssistantRail();
  const [submitCount, setSubmitCount] = useState(0);
  const bumpSubmit = useCallback(() => setSubmitCount((n) => n + 1), []);

  const { ask } = machine;
  const view = useRef({ ctx, ds });
  useEffect(() => {
    view.current = { ctx, ds };
  });
  const submitRef = useRef<(question: string, about?: AskContext) => void>(() => {});
  useEffect(() => {
    submitRef.current = (question, about) => {
      const { ctx: c, ds: d } = view.current;
      logEvent({ type: "ask", question });
      const entity = entityOf(c);
      ask(question, about ?? askContext(entity, entityName(d, entity), c.period));
      setSubmitCount((n) => n + 1);
    };
  });
  const submit = useCallback((question: string, about?: AskContext) => {
    submitRef.current(question, about);
  }, []);

  // An "Ask why" button sends through here, so it works while no panel is mounted.
  useRegisterAskSender((text, about) => {
    if (machine.isStreaming) return false;
    submit(text, about);
    return true;
  });

  // Screen-reader announcement and the unread count for the end of an answer.
  const [announcement, setAnnouncement] = useState<{ n: number; text: string }>({ n: 0, text: "" });
  const seen = useRef(new Map<string, Answer["status"]>());
  useEffect(() => {
    for (const a of machine.answers) {
      const before = seen.current.get(a.id);
      seen.current.set(a.id, a.status);
      const text = ANNOUNCEMENT[a.status];
      if (before === "streaming" && text) {
        setAnnouncement((p) => ({ n: p.n + 1, text }));
        if (a.status === "done") noteAnswerDone();
      }
    }
  }, [machine.answers, noteAnswerDone]);

  const value = useMemo(
    () => ({ ...machine, submit, submitCount, bumpSubmit }),
    [machine, submit, submitCount, bumpSubmit],
  );
  const announced = <span key={announcement.n}>{announcement.text}</span>;
  return (
    <MachineContext.Provider value={value}>
      {children}
      {liveHost === undefined ? (
        <div role="status" aria-live="polite" className="sr-only">
          {announced}
        </div>
      ) : liveHost ? (
        // The shell's live region stays mounted while the panel is collapsed.
        createPortal(announced, liveHost)
      ) : null}
    </MachineContext.Provider>
  );
}

/** The session's answer machine, or null outside a provider (the panel then mounts its own). */
export function useAnswerMachineContext(): MachineValue | null {
  return useContext(MachineContext);
}
