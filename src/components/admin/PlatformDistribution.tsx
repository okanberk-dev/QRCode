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

const PLATFORM_COLORS: Record<string, { bg: string; bar: string; text: string; icon: React.ReactNode }> = {
  google: { bg: 'bg-blue-50', bar: 'bg-[#4285F4]', text: 'text-[#4285F4]', icon: <img src="/platforms/google.svg" alt="Google" loading="lazy" decoding="async" className="w-4 h-4 object-cover rounded-sm" /> },
  yemeksepeti: { bg: 'bg-red-50', bar: 'bg-[#FA0050]', text: 'text-[#FA0050]', icon: <img src="/platforms/yemeksepeti.svg" alt="Yemeksepeti" loading="lazy" decoding="async" className="w-4 h-4 object-cover rounded-sm" /> },
  getir: { bg: 'bg-purple-50', bar: 'bg-[#5D3EBC]', text: 'text-[#5D3EBC]', icon: <img src="/platforms/getir.svg" alt="Getir" loading="lazy" decoding="async" className="w-4 h-4 object-cover rounded-sm" /> },
  trendyol_go: { bg: 'bg-[#EAF9B8]', bar: 'bg-[#F27A1A]', text: 'text-[#F27A1A]', icon: <img src="/platforms/trendyol-go.svg" alt="Trendyol" loading="lazy" decoding="async" className="w-4 h-4 object-cover rounded-sm" /> },
  tripadvisor: { bg: 'bg-emerald-50', bar: 'bg-[#00AF87]', text: 'text-[#00AF87]', icon: <img src="/platforms/tripadvisor.svg" alt="Tripadvisor" loading="lazy" decoding="async" className="w-4 h-4 object-cover rounded-sm" /> },
  airbnb: { bg: 'bg-pink-50', bar: 'bg-[#FF5A5F]', text: 'text-[#FF5A5F]', icon: <img src="/platforms/airbnb.svg" alt="Airbnb" loading="lazy" decoding="async" className="w-4 h-4 object-cover rounded-sm" /> },
  booking: { bg: 'bg-blue-50', bar: 'bg-[#003580]', text: 'text-[#003580]', icon: <img src="/platforms/booking.svg" alt="Booking" loading="lazy" decoding="async" className="w-4 h-4 object-cover rounded-sm" /> },
  yandex: { bg: 'bg-red-50', bar: 'bg-[#FC3F1D]', text: 'text-[#FC3F1D]', icon: <img src="/platforms/yandex.svg" alt="Yandex" loading="lazy" decoding="async" className="w-4 h-4 object-cover rounded-sm" /> },
  unspecified: { bg: 'bg-[#FFFFFF]', bar: 'bg-[#C9D0DB]', text: 'text-[#6B7280]', icon: '—' },
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
      {/* Horizontal bar chart — Pulse design'a sadık (graphite + lime hierarchy);
          eski renkli pill grid'i visual duplication yarattığı için kaldırıldı (§11.6 paterni). */}
      <div className="space-y-3">
        {sorted.map((item) => {
          const config = PLATFORM_COLORS[item.platform] || PLATFORM_COLORS.unspecified;
          const widthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;

          return (
            <div key={item.platform} className="flex items-center gap-3">
              <div className="w-24 sm:w-28 shrink-0 text-right">
                <span className={`text-[12px] font-medium ${config.text}`}>
                  {item.label}
                </span>
              </div>
              <div className="flex-1 h-8 bg-[#FFFFFF] rounded-xl overflow-hidden border border-[#EDEDED] relative">
                <div
                  className={`h-full rounded-xl ${config.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.max(widthPercent, 2)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-3 justify-end">
                  <span className="text-[12px] font-medium text-[#0A0A0A] tabular-nums">
                    {item.count} <span className="text-[#737373]">({percentage}%)</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-4 border-t border-[#EDEDED] mt-4">
        <span className="pulse-eyebrow text-[#737373]">{locale === 'tr' ? 'TOPLAM' : 'TOTAL'}</span>
        <span
          className="text-[18px] font-medium text-[#0A0A0A] tabular-nums tracking-[-0.02em]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {total}
        </span>
      </div>
    </div>
  );
}
