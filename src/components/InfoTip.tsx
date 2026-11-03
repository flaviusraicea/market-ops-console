import { Info, ICON_STROKE } from "@/components/icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** A small info button whose tooltip opens on hover and on keyboard focus. */
export function InfoTip({ label, children }: { label: string; children: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            className="inline-flex size-5 items-center justify-center rounded-control text-ink-muted hover:text-ink"
          >
            <Info aria-hidden className="size-3" strokeWidth={ICON_STROKE} />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72">{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
