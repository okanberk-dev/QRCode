import { Star, AlertTriangle, Hash, Heart } from 'lucide-react';

interface StatsProps {
  stats: {
    totalCount: number;
    avgRating: string;
    lowRatingCount: number;
    googleRedirectsCount?: number;
  };
}

const CARD =
  'bg-white p-5 sm:p-6 rounded-2xl border border-[#EDEDED] shadow-sm flex flex-col justify-between transition-all hover:-translate-y-0.5 hover:shadow-md group';

export default function StatsCards({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
      {/* Toplam Yorum */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#FFFFFF] text-[#1A1A1A] rounded-xl flex items-center justify-center group-hover:bg-[#0A0A0A] group-hover:text-white transition-colors">
            <Hash size={18} strokeWidth={2} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">GENEL</span>
        </div>
        <div>
          <p className="text-[11px] sm:text-[13px] font-medium text-[#1A1A1A] mb-1">Toplam Yorum</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] tabular-nums">{stats.totalCount}</h3>
        </div>
      </div>

      {/* Ortalama Puan */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-[#EAF9B8] text-[#A8D62E] rounded-xl flex items-center justify-center group-hover:bg-[#C6F24E] group-hover:text-[#0A0A0A] transition-colors">
            <Star size={18} fill="currentColor" strokeWidth={2} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-[#C6F24E]">RATING</span>
        </div>
        <div>
          <p className="text-[11px] sm:text-[13px] font-medium text-[#1A1A1A] mb-1">Ortalama Puan</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] tabular-nums">
            {stats.avgRating} <span className="text-xs sm:text-sm font-semibold text-[#6B7280]">/ 5</span>
          </h3>
        </div>
      </div>

      {/* Düşük Puanlar */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
            <AlertTriangle size={18} strokeWidth={2} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-red-500">KRİTİK</span>
        </div>
        <div>
          <p className="text-[11px] sm:text-[13px] font-medium text-[#1A1A1A] mb-1">Düşük Puanlı</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] tabular-nums">{stats.lowRatingCount}</h3>
        </div>
      </div>

      {/* Pozitif Yönlendirme */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-green-50 text-green-600 rounded-xl flex items-center justify-center group-hover:bg-green-600 group-hover:text-white transition-colors">
            <Heart size={18} strokeWidth={2} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-green-600">MUTLU</span>
        </div>
        <div>
          <p className="text-[11px] sm:text-[13px] font-medium text-[#1A1A1A] mb-1">Pozitif Yönlendirme</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#0A0A0A] tabular-nums">{stats.googleRedirectsCount || 0}</h3>
        </div>
      </div>
    </div>
  );
}
