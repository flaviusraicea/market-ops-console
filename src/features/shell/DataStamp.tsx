import { Eyebrow } from "@/components/Eyebrow";
import { formatPeriod } from "@/lib/format";

export function DataStamp({ latestPeriod }: { latestPeriod: string }) {
  return (
    <Eyebrow
      title={`Source: data.json, latest period ${latestPeriod}`}
      className="inline-flex items-center gap-1.5"
    >
      <span aria-hidden className="size-1.5 rounded-pill bg-ok-mark" />
      Data through {formatPeriod(latestPeriod)}
    </Eyebrow>
  );
}
