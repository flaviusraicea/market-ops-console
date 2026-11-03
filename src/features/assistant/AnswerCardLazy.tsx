"use client";

import dynamic from "next/dynamic";

const load = () => import("./AnswerCard").then((m) => m.AnswerCard);

/**
 * The answer card, with its sources table, citations and markdown-free renderer, is only needed once a question
 * has been asked, so it stays out of the first load. It is fetched when the composer takes focus, a question is
 * sent or an Ask why is clicked, which is before the first token arrives. The placeholder only matters if the
 * chunk is slower than the stream.
 */
export const AnswerCard = dynamic(load, {
  ssr: false,
  loading: () => <div aria-hidden className="h-24" />,
});

/** Starts the download early. Safe to call more than once. */
export function preloadAnswerCard() {
  void load();
}
