type SparklineProps = {
  values: readonly number[];
  /** Index of an anomalous point; it gets a ring. */
  anomalyIndex?: number | undefined;
  label: string;
  width?: number;
  height?: number;
};

const PAD = 4;

/** Design-system 6.4 / preview-spec 9.2: each line is scaled to its own min and max so the shape reads. */
export function Sparkline({
  values,
  anomalyIndex,
  label,
  width = 96,
  height = 24,
}: SparklineProps) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const step = values.length > 1 ? (width - PAD * 2) / (values.length - 1) : 0;
  const pt = (v: number, i: number): [number, number] => [
    PAD + i * step,
    height - PAD - ((v - lo) / span) * (height - PAD * 2),
  ];
  const d = values
    .map((v, i) => {
      const [x, y] = pt(v, i);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
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
      <path
        d={d}
        fill="none"
        stroke="var(--ink-2)"
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
      {last ? <circle cx={last[0]} cy={last[1]} r={1.5} fill="var(--ink)" /> : null}
    </svg>
  );
}
