'use client';

import { Star } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface RatingStatsProps {
  total: number;
  average: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function RatingStats({ total, average, distribution }: RatingStatsProps) {
  const { t } = useTranslation();

  const getPercentage = (count: number) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  return (
    <div className="w-full bg-white px-5 py-6 flex flex-col items-center">
      <div className="w-full flex items-center justify-between gap-8 mb-4 max-w-sm">
        {/* Left: Big Number */}
        <div className="flex flex-col items-center flex-shrink-0">
          <span className="text-5xl font-normal text-[#202124]">{average.toFixed(1)}</span>
          <div className="flex gap-0.5 mt-2">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                size={14} 
                className={i < Math.floor(average) ? "fill-[#fbbc04] text-[#fbbc04]" : "fill-gray-200 text-gray-200"} 
              />
            ))}
          </div>
          <span className="text-xs text-[#70757a] mt-2 font-medium">{total} Yorum</span>
        </div>

        {/* Right: Bars */}
        <div className="flex-grow space-y-1">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-[10px] font-medium text-[#70757a] w-2">{star}</span>
              <div className="flex-grow h-2.5 bg-[#e8eaed] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#fbbc04] rounded-full transition-all duration-1000"
                  style={{ width: `${getPercentage(distribution[star as keyof typeof distribution])}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
