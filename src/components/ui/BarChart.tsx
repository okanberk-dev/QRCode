interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  maxValue?: number;
  accent?: string;
  height?: number;
  className?: string;
  /**
   * Opt-in: bar üstünde her zaman değeri göster + hover/focus'ta bar
   * accent rengine geçer + bar tıklanabilir (a11y focus ring). Owner
   * dashboard "Etkileşim Eğilimi" + admin business growth chart'ında
   * tooltip okunabilirliği için açık.
   */
  showValues?: boolean;
  /**
   * İkincil seri (örn ortalama puan) için opsiyonel ek değer. Bar
   * üstündeki tooltip'e ikinci satır olarak yazılır.
   */
  secondaryValues?: { label: string; values: number[] };
}

const HATCH = "repeating-linear-gradient(-45deg, rgba(255,255,255,0.26) 0 3px, transparent 3px 8px)";
const IDLE_BAR = "#E3E3E6";

/**
 * Small bar chart (Fintora "Transaction Volume", docs/design/DASHBOARD_DESIGN.md
 * §5.9): thin round bars, the peak bar black with a diagonal hatch, the
 * rest light grey; 12px grey labels with the peak one in ink; a black
 * tooltip.
 */
export function BarChart({
  data,
  maxValue,
  accent = "var(--color-pn-accent)",
  height = 120,
  className = "",
  showValues = false,
  secondaryValues,
}: BarChartProps) {
  if (!data?.length) return null;
  const max = maxValue || Math.max(...data.map((d) => d.value)) || 1;
  // showValues mode reserves 24px on top for the value label.
  const topReserve = showValues ? 24 : 0;
  const innerMaxBarHeight = Math.max(height - 24 - topReserve, 4);
  const peakFill = `${HATCH}, ${accent}`;
  return (
    <div
      className={`flex items-end gap-1.5 sm:gap-2 ${className}`}
      style={{ height, padding: `${topReserve}px 0 24px` }}
      role="img"
      aria-label="bar chart"
    >
      {data.map((d, i) => {
        const h = (d.value / max) * innerMaxBarHeight;
        const isPeak = d.value === max && max > 0;
        const secVal = secondaryValues?.values[i];
        const tooltipParts = [`${d.label}: ${d.value}`];
        if (secondaryValues && secVal !== undefined) {
          tooltipParts.push(`${secondaryValues.label}: ${secVal}`);
        }
        const tooltipText = tooltipParts.join("\n");
        const label = (
          <div
            className="absolute whitespace-nowrap"
            style={{
              bottom: -22,
              fontSize: 12,
              color: isPeak ? "var(--color-pn-ink)" : "#9A9A9A",
              fontWeight: isPeak ? 500 : 400,
            }}
          >
            {d.label}
          </div>
        );

        if (showValues) {
          return (
            <button
              key={`${d.label}-${i}`}
              type="button"
              className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end gap-1.5 rounded-full border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
              title={tooltipText}
              aria-label={tooltipText.replace(/\n/g, ", ")}
            >
              {/* Value above the bar, 6px gap; the top padding keeps it inside. */}
              <span
                className="absolute tabular-nums transition-opacity"
                style={{
                  bottom: Math.max(h, 4) + 6,
                  fontSize: 12,
                  fontWeight: isPeak ? 500 : 400,
                  color: isPeak ? "var(--color-pn-ink)" : "#737373",
                }}
              >
                {d.value}
              </span>
              <div
                className="w-full rounded-full transition-[filter] duration-200 group-hover:brightness-95"
                style={{
                  maxWidth: 24,
                  height: Math.max(h, 4),
                  background: isPeak ? peakFill : IDLE_BAR,
                }}
              />
              {label}
              {/* Black tooltip — shown on hover / focus. */}
              {secondaryValues && secVal !== undefined && (
                <span
                  className="pointer-events-none absolute z-10 whitespace-nowrap rounded-[12px] bg-pn-ink px-3 py-1.5 text-[12px] font-medium tabular-nums text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{ bottom: Math.max(h, 4) + 28 }}
                >
                  {secondaryValues.label}: {secVal}
                </span>
              )}
            </button>
          );
        }

        return (
          <div
            key={`${d.label}-${i}`}
            className="relative flex h-full flex-1 flex-col items-center justify-end gap-1.5"
          >
            <div
              className="w-full rounded-full transition-all duration-200"
              style={{
                maxWidth: 24,
                height: Math.max(h, 4),
                background: isPeak ? peakFill : IDLE_BAR,
              }}
              title={tooltipText}
            />
            {label}
          </div>
        );
      })}
    </div>
  );
}

export default BarChart;
