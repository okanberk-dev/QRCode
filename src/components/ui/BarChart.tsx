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
}

export function BarChart({
  data,
  maxValue,
  accent = "#0A0A0A",
  height = 120,
  className = "",
}: BarChartProps) {
  if (!data?.length) return null;
  const max = maxValue || Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div
      className={`flex items-end gap-2 ${className}`}
      style={{ height, padding: "0 0 24px" }}
      role="img"
      aria-label="bar chart"
    >
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 24);
        const isPeak = d.value === max && max > 0;
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
              title={`${d.label}: ${d.value}`}
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
