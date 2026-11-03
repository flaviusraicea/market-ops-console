import { svgPath } from "./svgPath";

type SparklineProps = {
  values: readonly number[];
  /** A second line, dotted, drawn on the same scale (for example the forecast beside the actuals). */
  secondary?: readonly number[];
  /** Index of an anomalous point; it gets a ring. */
  anomalyIndex?: number | undefined;
  label: string;
  /** Line and end-dot colour, a CSS colour such as `var(--bad-mark)`. Defaults to the neutral ink. */
  color?: string;
  width?: number;
  height?: number;
};

const PAD = 4;

/** Design-system 6.4 / preview-spec 9.2: the line is scaled to its own min and max so the shape reads. */
export function Sparkline({
  values,
  secondary,
  anomalyIndex,
  label,
  color,
  width = 96,
  height = 24,
}: SparklineProps) {
  const range = secondary ? [...values, ...secondary] : values;
  const lo = Math.min(...range);
  const hi = Math.max(...range);
  const span = hi - lo || 1;
  const step = values.length > 1 ? (width - PAD * 2) / (values.length - 1) : 0;
  const pt = (v: number, i: number): [number, number] => [
    PAD + i * step,
    height - PAD - ((v - lo) / span) * (height - PAD * 2),
  ];
  const path = (series: readonly number[]) => svgPath(series.map((v, i) => pt(v, i)));
  const d = path(values);
  const last = values.length ? pt(values[values.length - 1]!, values.length - 1) : undefined;
  const ring =
    anomalyIndex !== undefined && values[anomalyIndex] !== undefined
      ? pt(values[anomalyIndex]!, anomalyIndex)
      : undefined;
  return (
    <svg
      role="img"
      aria-label={label}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="block"
    >
      {secondary ? (
        <path
          d={path(secondary)}
          fill="none"
          stroke="var(--series-forecast)"
          strokeWidth={1}
          strokeDasharray="2 2"
        />
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={color ?? "var(--ink-2)"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {ring ? (
        <circle
          cx={ring[0]}
          cy={ring[1]}
          r={4}
          fill="none"
          stroke="var(--bad-mark)"
          strokeWidth={1.5}
        />
      ) : null}
      {last ? <circle cx={last[0]} cy={last[1]} r={1.5} fill={color ?? "var(--ink)"} /> : null}
    </svg>
  );
}
