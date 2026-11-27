interface SparklineProps {
  values: number[];
  w?: number;
  h?: number;
  /** Line colour (default: Pano black). */
  color?: string;
  /** Area colour under the line (default: the line colour, faint). */
  fill?: string;
  /** Area opacity (default 1 with `fill`, 0.08 without). */
  fillOpacity?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Monotone cubic (Fritsch–Carlson) SVG path through the points: a smooth
 * curve that never overshoots between samples (no zigzag spikes, §58).
 */
export function monotonePath(pts: Array<[number, number]>): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    slope.push(dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    m.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  m.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const c = dx[i] / 3;
    d += ` C${x0 + c},${y0 + m[i] * c} ${x1 - c},${y1 - m[i + 1] * c} ${x1},${y1}`;
  }
  return d;
}

export function Sparkline({
  values,
  w = 80,
  h = 24,
  color = "var(--color-pn-accent)",
  fill,
  fillOpacity,
  strokeWidth = 1.5,
  className = "",
}: SparklineProps) {
  if (!values?.length) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1 || 1);
  // 2 px inset so the stroke is not clipped at the top / bottom.
  const pts = values.map((v, i): [number, number] => [i * stepX, h - 2 - ((v - min) / range) * (h - 4)]);
  const line = monotonePath(pts);
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <path d={area} fill={fill ?? color} opacity={fillOpacity ?? (fill ? 1 : 0.08)} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default Sparkline;
