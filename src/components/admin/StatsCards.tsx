import { Star, MessageSquareWarning, Hash, Zap, Heart } from 'lucide-react';

interface StatsProps {
  stats: {
    totalCount: number;
    avgRating: string;
    lowRatingCount: number;
    todayCount: number;
    googleRedirectsCount?: number;
  };
}

export default function StatsCards({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
      {/* Toplam Yorum */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-gray-800 group-hover:text-white transition-colors">
            <Hash size={20} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#ada89f]">GENEL</span>
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#6b6760] mb-1">Toplam Yorum</p>
          <h3 className="text-3xl font-black text-[#1f1e1d] tabular-nums tracking-tighter">{stats.totalCount}</h3>
        </div>
      </div>

      {/* Ortalama Puan */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 bg-yellow-50 text-yellow-500 rounded-xl flex items-center justify-center group-hover:bg-yellow-500 group-hover:text-white transition-colors">
            <Star size={20} fill="currentColor" strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FDBF1D]">RATING</span>
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#6b6760] mb-1">Ortalama Puan</p>
          <h3 className="text-3xl font-black text-[#1f1e1d] tabular-nums tracking-tighter">
            {stats.avgRating} <span className="text-sm font-bold text-[#ada89f]">/ 5</span>
          </h3>
        </div>
      </div>

      {/* Düşük Puanlar */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
            <MessageSquareWarning size={20} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-400">KRİTİK</span>
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#6b6760] mb-1">Düşük Puanlı</p>
          <h3 className="text-3xl font-black text-[#1f1e1d] tabular-nums tracking-tighter">{stats.lowRatingCount}</h3>
        </div>
      </div>

      {/* Bugün */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">CANLI</span>
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#6b6760] mb-1">Bugün Gelen</p>
          <h3 className="text-3xl font-black text-[#1f1e1d] tabular-nums tracking-tighter">{stats.todayCount}</h3>
        </div>
      </div>

      {/* Pozitif Yönlendirme */}
      <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:shadow-md group">
        <div className="flex items-center justify-between mb-5">
          <div className="w-11 h-11 bg-green-50 text-green-500 rounded-xl flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
            <Heart size={20} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-green-400">MUTLU</span>
        </div>
        <div>
          <p className="text-[13px] font-bold text-[#6b6760] mb-1">Pozitif Yönlendirme</p>
          <h3 className="text-3xl font-black text-[#1f1e1d] tabular-nums tracking-tighter">{stats.googleRedirectsCount || 0}</h3>
        </div>
      </div>
    </div>
  );
}
