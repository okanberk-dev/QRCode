'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  t: (key: any) => string;
  platform?: string;
}

export default function StarRating({ rating, onRatingChange, t, platform }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const active = hoverRating || rating;

  const platformLabels: Record<string, { label: string; bg: string }> = {
    google: { label: 'Google', bg: 'bg-[#4285F4]' },
    yemeksepeti: { label: 'Yemeksepeti', bg: 'bg-[#FA0050]' },
    getir: { label: 'Getir', bg: 'bg-[#5D3EBC]' },
    trendyol_go: { label: 'Trendyol GO', bg: 'bg-[#F27A1A]' },
  };

  const currentPlatform = platform ? platformLabels[platform] : null;

  const labels: Record<number, string> = {
    1: t('rating_very_poor'),
    2: t('rating_poor'),
    3: t('rating_fair'),
    4: t('rating_good'),
    5: t('rating_excellent'),
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full py-4">
      {/* Stars Row */}
      <div className="flex flex-row gap-3 justify-center items-center w-full">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= active;
          const isSelected = star <= rating;
          
          return (
            <button
              key={star}
              type="button"
              onClick={() => onRatingChange(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onTouchStart={() => setHoverRating(star)}
              onTouchEnd={() => { onRatingChange(star); setHoverRating(0); }}
              aria-label={`${star} yıldız`}
              className="focus:outline-none p-1.5 transition-all duration-200 active:scale-90 relative group"
            >
              <Star
                size={48}
                className={`transition-all duration-300 ${
                  isActive
                    ? 'fill-[#F4B400] text-[#F4B400] scale-110 shadow-sm'
                    : 'text-gray-200 fill-transparent'
                } ${isSelected && !hoverRating ? 'fill-[#F4B400] text-[#F4B400]' : ''}`}
                strokeWidth={isActive ? 1.5 : 1}
              />
              
              {/* Subtle glow effect for active stars */}
              {isActive && (
                <div className="absolute inset-0 bg-[#F4B400] opacity-5 blur-xl rounded-full scale-150 pointer-events-none transition-opacity duration-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Label */}
      <div className="h-6 flex items-center justify-center transition-all duration-300">
        {active > 0 && labels[active] ? (
          <span className="text-[15px] font-bold text-gray-800 animate-in fade-in zoom-in-95 duration-300">
            {labels[active]}
          </span>
        ) : (
          <span className="text-[13px] text-gray-400 font-bold uppercase tracking-[0.1em]">
            Puan Verin
          </span>
        )}
      </div>
    </div>
  );
}
