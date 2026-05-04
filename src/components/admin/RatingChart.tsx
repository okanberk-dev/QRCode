interface RatingChartProps {
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  totalCount: number;
}

export default function RatingChart({ distribution, totalCount }: RatingChartProps) {
  const maxCount = Math.max(...Object.values(distribution));

  return (
    <div className="space-y-3 w-full">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star as keyof typeof distribution] || 0;
        const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const displayPercentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
        const barColor = star >= 4 ? '#0A0A0A' : star === 3 ? '#A3A3A3' : '#DC2626';

        return (
          <div key={star} className="grid grid-cols-[38px_1fr_72px] items-center gap-3">
            <div className="flex items-center gap-0.5 text-[12px] font-semibold text-[#0A0A0A] tabular-nums">
              {star}
              <span className="text-[#C6F24E]">★</span>
            </div>

            <div className="h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percentage}%`, background: barColor }}
              />
            </div>

            <div className="text-right">
              <span
                className="text-[13px] font-semibold text-[#0A0A0A] tabular-nums"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {count}
              </span>
              <span className="pulse-eyebrow text-[#737373] ml-1.5">({displayPercentage}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
