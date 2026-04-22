'use client';

interface PlatformItem {
  platform: string;
  label: string;
  count: number;
  avgRating?: number | null;
}

interface PlatformDistributionProps {
  data: PlatformItem[];
  locale?: 'tr' | 'en';
}

const PLATFORM_COLORS: Record<string, { bg: string; bar: string; text: string; icon: string }> = {
  google: { bg: 'bg-blue-50', bar: 'bg-[#4285F4]', text: 'text-[#4285F4]', icon: 'G' },
  yemeksepeti: { bg: 'bg-red-50', bar: 'bg-[#FA0050]', text: 'text-[#FA0050]', icon: '🍽️' },
  getir: { bg: 'bg-purple-50', bar: 'bg-[#5D3EBC]', text: 'text-[#5D3EBC]', icon: '🛵' },
  trendyol_go: { bg: 'bg-[#FFF8D6]', bar: 'bg-[#F27A1A]', text: 'text-[#F27A1A]', icon: '🧡' },
  unspecified: { bg: 'bg-[#F8F6F1]', bar: 'bg-[#C9D0DB]', text: 'text-[#6B7280]', icon: '—' },
};

export default function PlatformDistribution({ data, locale = 'tr' }: PlatformDistributionProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-[#6B7280] text-sm font-bold">
        {locale === 'tr' ? 'Henüz platform verisi yok.' : 'No platform data yet.'}
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const maxCount = sorted.length > 0 ? sorted[0].count : 1;

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sorted.map((item) => {
          const config = PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.unspecified;
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
          return (
            <div
              key={item.platform}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl ${config.bg} border border-[#E8ECF2]`}
            >
              <span className="text-sm">{config.icon}</span>
              <span className={`text-[11px] font-black ${config.text}`}>{item.label}</span>
              <span className="text-[11px] font-black text-[#1A2332]">{item.count}</span>
              <span className="text-[10px] font-bold text-[#6B7280]">({percentage}%)</span>
            </div>
          );
        })}
      </div>

      {/* Horizontal bar chart */}
      <div className="space-y-3">
        {sorted.map((item) => {
          const config = PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.unspecified;
          const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.platform} className="flex items-center gap-3">
              <div className="w-24 sm:w-28 shrink-0 text-right">
                <span className={`text-[11px] font-black uppercase tracking-wider ${config.text}`}>
                  {item.label}
                </span>
              </div>
              <div className="flex-1 h-8 bg-[#F8F6F1] rounded-xl overflow-hidden border border-[#E8ECF2] relative">
                <div
                  className={`h-full rounded-xl ${config.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(widthPercent, 2)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-3 justify-end">
                  <span className="text-[11px] font-black text-[#2A3444]">
                    {item.count} <span className="text-[#6B7280] font-bold">({percentage}%)</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E8ECF2] mt-4">
        <span className="text-[11px] font-black text-[#6B7280] uppercase tracking-widest">
          {locale === 'tr' ? 'TOPLAM' : 'TOTAL'}
        </span>
        <span className="text-lg font-black text-[#1A2332]">{total}</span>
      </div>
    </div>
  );
}
