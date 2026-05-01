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

export function BarChart({
  data,
  maxValue,
  accent = "#0A0A0A",
  height = 120,
  className = "",
  showValues = false,
  secondaryValues,
}: BarChartProps) {
  if (!data?.length) return null;
  const max = maxValue || Math.max(...data.map((d) => d.value)) || 1;
  // showValues mode'da üstte value badge için 24px ek alan ayır (eski versiyon
  // peak bar'da badge container'dan taşıyordu — Pzt 5 yorum, badge "5" üstte
  // kayboluyordu).
  const topReserve = showValues ? 24 : 0;
  const innerMaxBarHeight = Math.max(height - 24 - topReserve, 4);
  return (
    <div
      className={`flex items-end gap-2 ${className}`}
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

        if (showValues) {
          return (
            <button
              key={`${d.label}-${i}`}
              type="button"
              className="group flex-1 flex flex-col items-center gap-1.5 relative h-full justify-end bg-transparent border-0 p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6F24E] focus-visible:ring-offset-2 rounded"
              title={tooltipText}
              aria-label={tooltipText.replace(/\n/g, ", ")}
            >
              {/* Value badge above bar — 6px gap, top alan padding-top ile ayrılmış */}
              <span
                className="absolute font-semibold text-[#0A0A0A] transition-opacity"
                style={{
                  bottom: Math.max(h, 4) + 6,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {d.value}
              </span>
              <div
                className="w-full rounded transition-colors duration-200 group-hover:opacity-90"
                style={{
                  maxWidth: 28,
                  height: Math.max(h, 4),
                  background: isPeak ? accent : "#D4D4D4",
                }}
              />
              <div
                className="absolute font-medium"
                style={{ bottom: -22, fontSize: 10, color: "#737373" }}
              >
                {d.label}
              </div>
              {/* Hover tooltip card — hidden by default, shown on group-hover */}
              {secondaryValues && secVal !== undefined && (
                <span
                  className="pointer-events-none absolute z-10 rounded-lg border border-[#EDEDED] bg-white px-2.5 py-1.5 text-[10px] font-medium text-[#0A0A0A] opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{
                    bottom: Math.max(h, 4) + 56,
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "nowrap",
                  }}
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
            className="flex-1 flex flex-col items-center gap-1.5 relative h-full justify-end"
          >
            <div
              className="w-full rounded transition-all duration-200"
              style={{
                maxWidth: 28,
                height: Math.max(h, 4),
                background: isPeak ? accent : "#E5E5E5",
              }}
              title={tooltipText}
            />
            <div
              className="absolute font-medium"
              style={{ bottom: -22, fontSize: 10, color: "#737373" }}
            >
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default BarChart;
