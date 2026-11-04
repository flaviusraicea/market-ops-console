"use client";

import { useCallback, useEffect, useState, type ComponentProps } from "react";

import { reportError } from "@/lib/events";
import type { AnswerCard as AnswerCardView } from "./AnswerCard";
import { AiCard, AiLabel, FailedRow, QuestionEcho } from "./AnswerShell";

type Card = typeof AnswerCardView;

let loaded: Card | null = null;
let pending: Promise<void> | null = null;

/**
 * The answer card, with its sources table and citations, is only needed once a question has been asked, so it
 * stays out of the first load. Starting the download early (first keystroke, a sent question, an Ask why) means it
 * has arrived before the first token does. Safe to call more than once. A failed download is forgotten, so a
 * retry fetches it again. (Not React.lazy: a story that renders an answer on the first frame needs the card to be
 * synchronous once it has loaded, which React.lazy only is after a Suspense round trip.)
 */
export function preloadAnswerCard(): Promise<void> {
  pending ??= import("./AnswerCard").then(
    (m) => {
      loaded = m.AnswerCard;
    },
    (error: unknown) => {
      pending = null;
      throw error;
    },
  );
  return pending;
}

/** Starts the download without caring about the outcome: a card that needs it shows its own error and retries. */
export function warmAnswerCard(): void {
  preloadAnswerCard().catch(() => {});
}

/** Renders the card as soon as it is loaded, and synchronously on every use after the first. */
export function AnswerCard(props: ComponentProps<Card>) {
  const [Loaded, setLoaded] = useState<Card | null>(() => loaded);
  const [failed, setFailed] = useState(false);

  const request = useCallback(() => {
    preloadAnswerCard().then(
      () => setLoaded(() => loaded),
      (error: unknown) => {
        reportError(error, { source: "fetch", route: "answer-card chunk" });
        setFailed(true);
      },
    );
  }, []);

  useEffect(() => {
    if (!Loaded) request();
  }, [Loaded, request]);

  if (Loaded) return <Loaded {...props} />;
  const { question, about } = props.answer;
  return (
    // The question shows from local state at once, whatever happens to the download.
    <div className="flex flex-col gap-2">
      <QuestionEcho question={question} about={about} />
      {failed ? (
        // Offline or a lost chunk: the one failed card. Retry puts the question back in the composer and fetches
        // the card again, so nothing typed is lost.
        <AiCard>
          <AiLabel />
          <FailedRow
            partial={false}
            onRetry={() => {
              props.onTry(question);
              setFailed(false);
              request();
            }}
          />
        </AiCard>
      ) : (
        // Only shows if the chunk is slower than the stream.
        <div aria-hidden className="h-24" />
      )}
    </div>
  );
}
