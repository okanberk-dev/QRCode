interface SparklineProps {
  values: number[];
  w?: number;
  h?: number;
  color?: string;
  className?: string;
}

export function Sparkline({ values, w = 80, h = 24, color = "#0A0A0A", className = "" }: SparklineProps) {
  if (!values?.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1 || 1);
  const points = values
    .map((v, i) => `${i * stepX},${h - ((v - min) / range) * h}`)
    .join(" ");
  const area = `0,${h} ${points} ${w},${h}`;
  return (
    <svg
      width={w}
      height={h}
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <polygon points={area} fill={color} opacity="0.07" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default Sparkline;
