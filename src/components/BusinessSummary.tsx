'use client';

import { Star, MapPin } from 'lucide-react';

interface BusinessSummaryProps {
  name: string;
  address: string | null;
  category: string;
}

export default function BusinessSummary({ name, address, category }: BusinessSummaryProps) {
  return (
    <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between bg-gray-50/50 rounded-3xl p-6 md:p-8 border border-gray-100">
        {/* Overall Rating */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-1">
          <span className="text-6xl font-medium text-gray-900 leading-none">4.8</span>
          <div className="flex gap-0.5 my-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={18} className="fill-[#fbbc04] text-[#fbbc04]" />
            ))}
          </div>
          <span className="text-sm text-gray-500 font-medium whitespace-nowrap">128 değerlendirme</span>
        </div>

        {/* Bar Chart Distribution */}
        <div className="flex-1 w-full max-w-[300px] flex flex-col gap-2">
          {[
            { star: 5, percent: 85 },
            { star: 4, percent: 10 },
            { star: 3, percent: 3 },
            { star: 2, percent: 1 },
            { star: 1, percent: 1 },
          ].map((row) => (
            <div key={row.star} className="flex items-center gap-3 w-full">
              <span className="text-[11px] font-medium text-gray-400 w-2 text-right">{row.star}</span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#fbbc04] rounded-full transition-all duration-1000"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Business Micro-Info */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs sm:text-sm text-gray-500 px-2 justify-center md:justify-start">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={16} className="text-gray-400 flex-shrink-0" />
          <span className="truncate">{address || 'Adres bilgisi mevcut değil'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-600 font-medium italic">Şu an açık</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span>·</span>
          <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{category}</span>
        </div>
      </div>
    </div>
  );
}
