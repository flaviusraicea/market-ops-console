import { cn } from "@/components/cn";
import { pageHeadingProps } from "@/lib/motion";
import { Eyebrow } from "@/components/Eyebrow";
import { InfoTip } from "@/components/InfoTip";
import { DataStamp } from "@/features/shell/DataStamp";
import type { VerdictVM } from "./viewModel";

// Headline words only: the brighter display colours on their tinted wash read at distance, where the body status
// text (tuned for 12 to 14 px) looks black. Large text, so WCAG asks 3:1.
const WASH = "rounded-mark px-[0.08em] [box-decoration-break:clone]";
const STATUS_TEXT = {
  on_track: `text-ok-display bg-ok-bg ${WASH}`,
  at_risk: `text-warn-display bg-warn-bg ${WASH}`,
  off_track: `text-bad-display bg-bad-bg ${WASH}`,
} as const;

const ATTENTION_TEXT = {
  bad: `text-bad-display bg-bad-bg ${WASH}`,
  warn: `text-warn-display bg-warn-bg ${WASH}`,
  none: "",
} as const;

/**
 * The first line of the Overview: one sentence that answers "are we on track?". It is the page's h2.
 * Status and the attention phrase carry colour. Numbers stay plain text: an underline with no behaviour behind it
 * would promise a link.
 */
export function Verdict({ verdict }: { verdict: VerdictVM }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-x-4">
        <Eyebrow>{verdict.eyebrow}</Eyebrow>
        <InfoTip label="About this verdict" className="mr-3">
          {verdict.caption}
        </InfoTip>
        <span className="sr-only">{verdict.caption}</span>
      </div>
      {/* The header's stamp is hidden under 768 px; the Overview carries it here instead. */}
      <DataStamp latestPeriod={verdict.latestPeriod} className="md:hidden" />
      <h2
        id="verdict-h"
        {...pageHeadingProps}
        className="num font-display outline-none text-[length:var(--text-display)] leading-[var(--text-display-lh)] font-semibold tracking-[var(--text-display-ls)] text-balance text-ink"
      >
        {verdict.segments.map((segment, i) => (
          <span
            key={i}
            className={cn(
              segment.role === "status" && STATUS_TEXT[verdict.status],
              segment.role === "attention" && ATTENTION_TEXT[verdict.attention],
            )}
          >
            {segment.text}
          </span>
        ))}
      </h2>
    </div>
  );
}
