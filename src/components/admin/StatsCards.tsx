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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      {/* Toplam Yorum */}
      <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center group-hover:bg-[#111827] group-hover:text-white transition-colors">
            <Hash size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Genel</span>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 mb-1">Toplam Yorum</p>
          <h3 className="text-3xl font-black text-[#111827] tabular-nums">{stats.totalCount}</h3>
        </div>
      </div>

      {/* Ortalama Puan */}
      <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-[#FDBF1D]/10 text-[#FDBF1D] rounded-xl flex items-center justify-center group-hover:bg-[#FDBF1D] group-hover:text-[#111827] transition-colors">
            <Star size={20} fill="currentColor" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#FDBF1D]">Rating</span>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 mb-1">Ortalama Puan</p>
          <h3 className="text-3xl font-black text-[#111827] tabular-nums">
            {stats.avgRating} <span className="text-sm font-bold text-gray-300">/ 5</span>
          </h3>
        </div>
      </div>

      {/* Düşük Puanlar */}
      <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
            <MessageSquareWarning size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Kritik</span>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 mb-1">Düşük Puanlı</p>
          <h3 className="text-3xl font-black text-[#111827] tabular-nums">{stats.lowRatingCount}</h3>
        </div>
      </div>

      {/* Bugün */}
      <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
            <Zap size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Canlı</span>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 mb-1">Bugün Gelen</p>
          <h3 className="text-3xl font-black text-[#111827] tabular-nums">{stats.todayCount}</h3>
        </div>
      </div>

      {/* Yüksek Memnuniyet */}
      <div className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between transition-all hover:shadow-md group">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-green-50 text-green-500 rounded-xl flex items-center justify-center group-hover:bg-green-500 group-hover:text-white transition-colors">
            <Heart size={20} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Mutlu</span>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 mb-1">Pozitif Yönlendirme</p>
          <h3 className="text-3xl font-black text-[#111827] tabular-nums">{stats.googleRedirectsCount || 0}</h3>
        </div>
      </div>
    </div>
  );
}
