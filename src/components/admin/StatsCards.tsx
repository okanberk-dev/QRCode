import { Star, AlertTriangle, Hash, Heart } from 'lucide-react';

interface StatsProps {
  stats: {
    totalCount: number;
    avgRating: number;
    lowRatingCount: number;
    googleRedirectsCount?: number;
  };
}

const CARD =
  'bg-white p-5 sm:p-6 rounded-2xl border border-[#EDEDED] flex flex-col justify-between transition-colors hover:border-[#C6F24E]';

const VALUE_STYLE: React.CSSProperties = { fontFamily: 'var(--font-heading)' };

export default function StatsCards({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Toplam Yorum */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F5F5F5] text-[#525252]">
            <Hash size={14} strokeWidth={2} />
          </div>
          <span className="pulse-eyebrow text-[#737373]">GENEL</span>
        </div>
        <div>
          <p className="pulse-eyebrow text-[#737373] mb-2">Toplam Yorum</p>
          <h3
            className="text-[22px] sm:text-[28px] md:text-[30px] font-medium leading-none text-[#0A0A0A] tracking-[-0.025em] tabular-nums"
            style={VALUE_STYLE}
          >
            {stats.totalCount}
          </h3>
        </div>
      </div>

      {/* Ortalama Puan */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#EAF9B8] text-[#0A0A0A]">
            <Star size={14} fill="currentColor" strokeWidth={2} />
          </div>
          <span className="pulse-eyebrow text-[#A8D62E]">RATING</span>
        </div>
        <div>
          <p className="pulse-eyebrow text-[#737373] mb-2">Ortalama Puan</p>
          <h3
            className="text-[22px] sm:text-[28px] md:text-[30px] font-medium leading-none text-[#0A0A0A] tracking-[-0.025em] tabular-nums"
            style={VALUE_STYLE}
          >
            {typeof stats.avgRating === 'number' ? stats.avgRating.toFixed(1) : stats.avgRating}
            <span className="text-[14px] text-[#737373] ml-1">/ 5</span>
          </h3>
        </div>
      </div>

      {/* Düşük Puanlar */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500">
            <AlertTriangle size={14} strokeWidth={2} />
          </div>
          <span className="pulse-eyebrow text-red-500">KRİTİK</span>
        </div>
        <div>
          <p className="pulse-eyebrow text-[#737373] mb-2">Düşük Puanlı</p>
          <h3
            className="text-[22px] sm:text-[28px] md:text-[30px] font-medium leading-none text-[#0A0A0A] tracking-[-0.025em] tabular-nums"
            style={VALUE_STYLE}
          >
            {stats.lowRatingCount}
          </h3>
        </div>
      </div>

      {/* Pozitif Yönlendirme */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <Heart size={14} strokeWidth={2} />
          </div>
          <span className="pulse-eyebrow text-emerald-600">MUTLU</span>
        </div>
        <div>
          <p className="pulse-eyebrow text-[#737373] mb-2">Pozitif Yönlendirme</p>
          <h3
            className="text-[22px] sm:text-[28px] md:text-[30px] font-medium leading-none text-[#0A0A0A] tracking-[-0.025em] tabular-nums"
            style={VALUE_STYLE}
          >
            {stats.googleRedirectsCount || 0}
          </h3>
        </div>
      </div>
    </div>
  );
}
