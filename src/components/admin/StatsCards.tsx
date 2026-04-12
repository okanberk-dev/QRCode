import { Star, MessageSquareWarning, Hash } from 'lucide-react';

interface StatsProps {
  stats: {
    totalCount: number;
    avgRating: string;
    lowRatingCount: number;
    todayCount: number;
  };
}

export default function StatsCards({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Toplam Yorum</p>
          <h3 className="text-3xl font-bold text-gray-800">{stats.totalCount}</h3>
        </div>
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
          <Hash size={24} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Ortalama Puan</p>
          <h3 className="text-3xl font-bold text-gray-800">{stats.avgRating} <span className="text-base font-normal text-gray-400">/ 5</span></h3>
        </div>
        <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center">
          <Star size={24} fill="currentColor" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Düşük Puanlı (1-3)</p>
          <h3 className="text-3xl font-bold text-gray-800">{stats.lowRatingCount}</h3>
        </div>
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
          <MessageSquareWarning size={24} />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium mb-1">Bugün Gelen</p>
          <h3 className="text-3xl font-bold text-gray-800">{stats.todayCount}</h3>
        </div>
        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
