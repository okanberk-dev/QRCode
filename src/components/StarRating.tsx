'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  t: (key: any) => string;
}

export default function StarRating({ rating, onRatingChange, t }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const active = hoverRating || rating;

  const labels: Record<number, string> = {
    1: t('rating_very_poor'),
    2: t('rating_poor'),
    3: t('rating_fair'),
    4: t('rating_good'),
    5: t('rating_excellent'),
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full py-2">
      {/* Stars Row */}
      <div className="flex flex-row gap-2 justify-center items-center w-full">
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
              className="focus:outline-none p-1 transition-all duration-200 active:scale-90 relative group"
            >
              <Star
                size={44}
                className={`transition-all duration-300 ${
                  isActive
                    ? 'fill-[#fbbc04] text-[#fbbc04] scale-110'
                    : 'text-gray-200 fill-transparent'
                } ${isSelected && !hoverRating ? 'fill-[#fbbc04] text-[#fbbc04]' : ''}`}
                strokeWidth={isActive ? 1.5 : 1}
              />
              
              {/* Subtle glow effect for active stars */}
              {isActive && (
                <div className="absolute inset-0 bg-[#fbbc04] opacity-10 blur-xl rounded-full scale-150 pointer-events-none transition-opacity duration-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Dynamic Label */}
      <div className="h-8 flex items-center justify-center transition-all duration-300">
        {active > 0 && labels[active] ? (
          <span className="text-base font-semibold text-gray-700 animate-in fade-in slide-in-from-bottom-1">
            {labels[active]}
          </span>
        ) : (
          <span className="text-sm text-gray-400 font-medium">
            Deneyiminizi puanlayın
          </span>
        )}
      </div>
    </div>
  );
}
