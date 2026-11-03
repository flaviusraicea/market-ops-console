"use client";

import { useCallback, useEffect, useState, type ComponentProps } from "react";

import { Notice } from "@/components/Notice";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/events";
import type { AnswerCard as AnswerCardView } from "./AnswerCard";

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
  if (failed) {
    return (
      <Notice
        title="Answer could not be shown"
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setFailed(false);
              request();
            }}
          >
            Retry
          </Button>
        }
      >
        Part of the page did not load. Check your connection and try again.
      </Notice>
    );
  }
  // The placeholder only shows if the chunk is slower than the stream.
  return <div aria-hidden className="h-24" />;
}
