"use client";

import { ICON_STROKE, Sparkles } from "@/components/icons";
import { cn } from "@/components/cn";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Ask why where a row has no room for the words: a 32 px icon-only ghost button. The accessible name carries
 * the full question and the tooltip shows "Ask why". Needs a TooltipProvider above it, one per list.
 */
export function AskWhyIconButton({
  label,
  onAsk,
  className,
}: {
  label: string;
  onAsk: () => void;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={label}
          onClick={onAsk}
          className={cn("size-8 px-0", className)}
        >
          <Sparkles aria-hidden className="size-3.5 text-ai-label" strokeWidth={ICON_STROKE} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">Ask why</TooltipContent>
    </Tooltip>
  );
}
