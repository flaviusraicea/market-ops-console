"use client";

import { useEffect, useState } from "react";

import type { ResolvedTarget } from "@/domain";
import { useLatestAnswer } from "@/features/assistant/AnswerStore";
import { useConsoleContext } from "@/lib/context/useConsoleContext";

export const LANDING_MS = 2000;

export type Landing = { active: boolean; target: ResolvedTarget | undefined };

/**
 * The citation the URL points at (`cite` indexes the latest answer's chips), and whether it is still "landing":
 * for 2 s after the widget mounts or the citation changes the widget shows its ring and opens its tooltip.
 */
export function useLanding(): Landing {
  const { ctx } = useConsoleContext();
  const latest = useLatestAnswer();
  const resolution =
    ctx.cite !== undefined && latest?.status === "done"
      ? latest.citations[ctx.cite]?.resolution
      : undefined;
  const target = resolution?.ok ? resolution.target : undefined;
  const key = target && latest ? `${latest.id}:${ctx.cite}:${target.period}` : undefined;

  // The key whose two seconds are over; a new citation (or a remount) starts fresh.
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    if (!key) return;
    const t = setTimeout(() => setDone(key), LANDING_MS);
    return () => clearTimeout(t);
  }, [key]);

  return { active: key !== undefined && done !== key, target };
}
