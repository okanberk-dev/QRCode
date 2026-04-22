import { Star, AlertTriangle, Hash, Heart } from 'lucide-react';

interface StatsProps {
  stats: {
    totalCount: number;
    avgRating: string;
    lowRatingCount: number;
    googleRedirectsCount?: number;
  };
}

export default function StatsCards({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
      {/* Toplam Yorum */}
      <div className="bg-white p-4 sm:p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-gray-800 group-hover:text-white transition-colors">
            <Hash size={20} strokeWidth={2.5} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#6B7B93]">GENEL</span>
        </div>
        <div>
          <p className="text-[11px] sm:text-[13px] font-bold text-[#243554] mb-1">Toplam Yorum</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#0F2348] tabular-nums tracking-tighter">{stats.totalCount}</h3>
        </div>
      </div>

      {/* Ortalama Puan */}
      <div className="bg-white p-4 sm:p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-yellow-50 text-yellow-500 rounded-xl flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-white transition-colors">
            <Star size={20} fill="currentColor" strokeWidth={2.5} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#FF9A14]">RATING</span>
        </div>
        <div>
          <p className="text-[11px] sm:text-[13px] font-bold text-[#243554] mb-1">Ortalama Puan</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#0F2348] tabular-nums tracking-tighter">
            {stats.avgRating} <span className="text-xs sm:text-sm font-bold text-[#6B7B93]">/ 5</span>
          </h3>
        </div>
      </div>

      {/* Düşük Puanlar */}
      <div className="bg-white p-4 sm:p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
            <AlertTriangle size={20} strokeWidth={2.5} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-red-400">KRİTİK</span>
        </div>
        <div>
          <p className="text-[11px] sm:text-[13px] font-bold text-[#243554] mb-1">Düşük Puanlı</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#0F2348] tabular-nums tracking-tighter">{stats.lowRatingCount}</h3>
        </div>
      </div>

      {/* Pozitif Yönlendirme */}
      <div className="bg-white p-4 sm:p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-green-50 text-green-500 rounded-xl flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
            <Heart size={20} strokeWidth={2.5} />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-green-400">MUTLU</span>
        </div>
        <div>
          <p className="text-[11px] sm:text-[13px] font-bold text-[#243554] mb-1">Pozitif Yönlendirme</p>
          <h3 className="text-2xl sm:text-3xl font-black text-[#0F2348] tabular-nums tracking-tighter">{stats.googleRedirectsCount || 0}</h3>
        </div>
      </div>
    </div>
  );
}
