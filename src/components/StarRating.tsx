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
  const fallbackLabel = labels[5]?.toLowerCase?.() === 'excellent'
    ? 'Rate your experience'
    : 'Puan verin';

  return (
    <div className="flex w-full flex-col items-center gap-5 py-4">
      {currentPlatform && (
        <div className={`pulse-eyebrow inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-white ${currentPlatform.bg}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
          {currentPlatform.label}
        </div>
      )}

      <div className="w-full rounded-[28px] border border-[#EDEDED] bg-[#FAFAFA] px-3 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] sm:px-4">
        <div className="flex w-full flex-row flex-wrap items-center justify-center gap-2.5 sm:gap-3">
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
              aria-pressed={rating === star}
              className="group relative rounded-full p-1 transition-all duration-200 active:scale-90 focus:outline-none sm:p-1.5"
            >
              <span
                className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 sm:h-14 sm:w-14 ${
                  isActive
                    ? 'border-[#C6F24E]/30 bg-[#0A0A0A] shadow-[0_18px_34px_-24px_rgba(10,10,10,0.5)]'
                    : 'border-[#EAEAEA] bg-white'
                }`}
              >
                <Star
                  size={28}
                  className={`transition-all duration-300 ${
                    isActive
                      ? 'fill-[#C6F24E] text-[#C6F24E] scale-110'
                      : 'fill-transparent text-[#D4D4D4]'
                  } ${isSelected && !hoverRating ? 'fill-[#C6F24E] text-[#C6F24E]' : ''}`}
                  strokeWidth={isActive ? 1.5 : 1.2}
                />
              </span>
              
              {isActive && (
                <div className="pointer-events-none absolute inset-0 rounded-full bg-[#C6F24E] opacity-10 blur-xl transition-opacity duration-500" />
              )}
            </button>
          );
        })}
        </div>
      </div>

      <div className="h-6 flex items-center justify-center transition-all duration-300">
        {active > 0 && labels[active] ? (
          <span className="text-[15px] font-bold text-[#0A0A0A] animate-in fade-in zoom-in-95 duration-300">
            {labels[active]}
          </span>
        ) : (
          <span className="text-[13px] text-[#6B7280] font-bold uppercase tracking-[0.1em]">
            {fallbackLabel}
          </span>
        )}
      </div>
    </div>
  );
}
