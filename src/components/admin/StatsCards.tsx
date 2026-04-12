import { Star, MessageSquareWarning, Hash } from 'lucide-react';

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Toplam Yorum</p>
          <h3 className="text-3xl font-black text-[#111827]">{stats.totalCount}</h3>
        </div>
        <div className="w-12 h-12 bg-gray-100 text-[#111827] rounded-full flex items-center justify-center">
          <Hash size={24} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Ortalama Puan</p>
          <h3 className="text-3xl font-black text-[#111827]">{stats.avgRating} <span className="text-base font-normal text-gray-400">/ 5</span></h3>
        </div>
        <div className="w-12 h-12 bg-[#FDBF1D]/10 text-[#FDBF1D] rounded-full flex items-center justify-center">
          <Star size={24} fill="currentColor" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Düşük Puanlı (1-3)</p>
          <h3 className="text-3xl font-black text-[#111827]">{stats.lowRatingCount}</h3>
        </div>
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
          <MessageSquareWarning size={24} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Bugün Gelen</p>
          <h3 className="text-3xl font-black text-[#111827]">{stats.todayCount}</h3>
        </div>
        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between transition-all hover:shadow-md">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Yüksek Memnuniyet</p>
          <h3 className="text-3xl font-black text-[#111827]">{stats.googleRedirectsCount || 0}</h3>
        </div>
        <div className="w-12 h-12 bg-gray-100 text-[#111827] rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
