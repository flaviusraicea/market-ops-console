"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  resolveCitation,
  type Citation,
  type ChatContext,
  type Confidence,
  type Dataset,
  type Entity,
  type Kind,
  type Resolution,
} from "@/domain";
import { claimTextFor } from "./inlineMap";
import type { AskContext } from "./askWhy";
import { useDataset } from "@/lib/context/dataset";
import { reportError } from "@/lib/events";
import { askStream, type AskStream } from "@/lib/stream/chatClient";

export type Resolved = { citation: Citation; resolution: Resolution };

/**
 * `about` is where the question was asked from, e.g. "Portfolio · May 2026"; `asked` is that view's entity, so the
 * card can say when an answer covers more than the view (scopeNote.ts).
 */
type Base = { id: string; question: string; about?: string; asked?: Entity };
type Origin = Pick<Base, "about" | "asked">;

/** Where a question came from, carried from one state of its answer to the next. */
const carry = ({ about, asked }: Origin): Origin => ({
  ...(about ? { about } : {}),
  ...(asked ? { asked } : {}),
});

/** One answer's lifecycle (architecture.md section 7). A stopped answer is partial: no citations, no confidence. */
export type AnswerState =
  | { status: "idle" }
  | (Base & { status: "streaming"; text: string; controller: AbortController })
  | (Base & {
      status: "done";
      text: string;
      kind: Kind;
      confidence: Confidence;
      citations: Resolved[];
    })
  | (Base & { status: "stopped"; text: string })
  | (Base & { status: "failed"; text: string; message: string });

export type Answer = Exclude<AnswerState, { status: "idle" }>;

export type AnswerAction =
  | ({ type: "ASK"; id: string; question: string; controller: AbortController } & Origin)
  | { type: "TOKEN_FLUSH"; text: string }
  | {
      type: "DONE";
      kind: Kind;
      confidence: Confidence;
      citations: readonly Citation[];
      ds: Dataset;
    }
  | { type: "STOP" }
  | { type: "ERROR"; message: string }
  | { type: "RETRY"; id: string; controller: AbortController };

export function answerReducer(state: AnswerState, action: AnswerAction): AnswerState {
  switch (action.type) {
    case "ASK":
      return {
        status: "streaming",
        id: action.id,
        question: action.question,
        ...carry(action),
        text: "",
        controller: action.controller,
      };
    case "TOKEN_FLUSH":
      if (state.status !== "streaming") return state;
      return { ...state, text: state.text + action.text };
    case "DONE": {
      if (state.status !== "streaming") return state;
      const citations = action.citations.map((citation, i) => ({
        citation,
        resolution: resolveCitation(
          action.ds,
          citation,
          claimTextFor(state.text, action.citations, i),
        ),
      }));
      return {
        status: "done",
        id: state.id,
        question: state.question,
        ...carry(state),
        text: state.text,
        kind: action.kind,
        confidence: action.confidence,
        citations,
      };
    }
    case "STOP":
      if (state.status !== "streaming") return state;
      return {
        status: "stopped",
        id: state.id,
        question: state.question,
        ...carry(state),
        text: state.text,
      };
    case "ERROR":
      if (state.status !== "streaming") return state;
      return {
        status: "failed",
        id: state.id,
        question: state.question,
        ...carry(state),
        text: state.text,
        message: action.message,
      };
    case "RETRY":
      if (state.status === "idle" || state.status === "streaming") return state;
      return {
        status: "streaming",
        id: action.id,
        question: state.question,
        ...carry(state),
        text: "",
        controller: action.controller,
      };
  }
}

/** `id` addresses the answer an action applies to. ASK appends a new answer; RETRY appends a copy of `id` re-asked. */
export type HistoryMessage = { id: string; action: AnswerAction };

/** The session's answers, oldest first. In memory only. */
export function historyReducer(state: readonly Answer[], msg: HistoryMessage): Answer[] {
  const { id, action } = msg;
  if (action.type === "ASK") {
    const next = answerReducer({ status: "idle" }, action);
    return next.status === "idle" ? [...state] : [...state, next];
  }
  if (action.type === "RETRY") {
    const source = state.find((a) => a.id === id);
    if (!source) return [...state];
    const next = answerReducer(source, action);
    return next === source || next.status === "idle" ? [...state] : [...state, next];
  }
  return state.map((a) => {
    if (a.id !== id) return a;
    const next = answerReducer(a, action);
    return next.status === "idle" ? a : next;
  });
}

const STREAM_FAILURE = { source: "stream", route: "/api/chat" } as const;

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "The assistant could not answer.";
}

export function useAnswerMachine(stream: AskStream = askStream) {
  const ds = useDataset();
  const [answers, dispatch] = useReducer(historyReducer, [] as Answer[]);
  const answersRef = useRef<readonly Answer[]>(answers);
  const flushers = useRef(new Map<string, () => void>());
  const seq = useRef(0);
  // The view each answer was asked about, so a retry asks about the same view and not the one on screen now.
  const contexts = useRef(new Map<string, ChatContext>());

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    const live = flushers.current;
    return () => {
      for (const a of answersRef.current) if (a.status === "streaming") a.controller.abort();
      live.clear();
    };
  }, []);

  const run = useCallback(
    async (id: string, question: string, controller: AbortController) => {
      // Tokens collect in a buffer; one TOKEN_FLUSH per animation frame keeps renders at frame rate.
      let pending = "";
      let frame = 0;
      let settled = false;
      const flush = () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        if (pending === "") return;
        const text = pending;
        pending = "";
        dispatch({ id, action: { type: "TOKEN_FLUSH", text } });
      };
      flushers.current.set(id, flush);

      const finish = (action: AnswerAction) => {
        flush();
        settled = true;
        flushers.current.delete(id);
        dispatch({ id, action });
      };

      try {
        const context = contexts.current.get(id);
        await stream(question, {
          ...(context ? { context } : {}),
          signal: controller.signal,
          onEvent(event) {
            if (settled) return;
            switch (event.type) {
              case "token":
                pending += event.value;
                if (!frame) frame = requestAnimationFrame(flush);
                break;
              case "done":
                finish({
                  type: "DONE",
                  kind: event.kind,
                  confidence: event.confidence,
                  citations: event.citations,
                  ds,
                });
                break;
              case "error":
                reportError(event.message, STREAM_FAILURE);
                finish({ type: "ERROR", message: event.message });
                break;
              case "aborted":
                // stop() already moved the answer to `stopped`.
                pending = "";
                settled = true;
                flushers.current.delete(id);
                break;
            }
          },
        });
        if (!settled) {
          const message = "The connection closed before the answer finished.";
          reportError(message, STREAM_FAILURE);
          finish({ type: "ERROR", message });
        }
      } catch (err) {
        if (!settled) {
          reportError(err, STREAM_FAILURE);
          finish({ type: "ERROR", message: errorMessage(err) });
        }
      }
    },
    [ds, stream],
  );

  const ask = useCallback(
    (question: string, about?: AskContext) => {
      const id = `a${++seq.current}`;
      const controller = new AbortController();
      if (about?.period) contexts.current.set(id, { entity: about.entity, period: about.period });
      dispatch({
        id,
        action: {
          type: "ASK",
          id,
          question,
          ...(about ? { about: about.label } : {}),
          ...(about?.period ? { asked: about.entity } : {}),
          controller,
        },
      });
      void run(id, question, controller);
    },
    [run],
  );

  const stop = useCallback((id: string) => {
    const target = answersRef.current.find((a) => a.id === id);
    if (target?.status !== "streaming") return;
    flushers.current.get(id)?.();
    dispatch({ id, action: { type: "STOP" } });
    target.controller.abort();
  }, []);

  const retry = useCallback(
    (fromId: string) => {
      const source = answersRef.current.find((a) => a.id === fromId);
      if (!source || source.status === "streaming") return;
      const id = `a${++seq.current}`;
      const controller = new AbortController();
      const context = contexts.current.get(fromId);
      if (context) contexts.current.set(id, context);
      dispatch({ id: fromId, action: { type: "RETRY", id, controller } });
      void run(id, source.question, controller);
    },
    [run],
  );

  const isStreaming = answers.some((a) => a.status === "streaming");
  return { answers, ask, stop, retry, isStreaming };
}
