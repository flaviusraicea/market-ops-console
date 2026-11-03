"use client";

import { useEffect, useState, type ComponentProps } from "react";

import type { AnswerCard as AnswerCardView } from "./AnswerCard";

type Card = typeof AnswerCardView;

let loaded: Card | null = null;
let pending: Promise<void> | null = null;

/**
 * The answer card, with its sources table and citations, is only needed once a question has been asked, so it
 * stays out of the first load. Starting the download early (first keystroke, a sent question, an Ask why) means it
 * has arrived before the first token does. Safe to call more than once; the promise resolves once it is ready.
 */
export function preloadAnswerCard(): Promise<void> {
  pending ??= import("./AnswerCard").then((m) => {
    loaded = m.AnswerCard;
  });
  return pending;
}

/** Renders the card as soon as it is loaded, and synchronously on every use after the first. */
export function AnswerCard(props: ComponentProps<Card>) {
  const [Loaded, setLoaded] = useState<Card | null>(() => loaded);
  useEffect(() => {
    if (Loaded) return;
    let live = true;
    void preloadAnswerCard().then(() => live && setLoaded(() => loaded));
    return () => {
      live = false;
    };
  }, [Loaded]);
  // The placeholder only shows if the chunk is slower than the stream.
  return Loaded ? <Loaded {...props} /> : <div aria-hidden className="h-24" />;
}
