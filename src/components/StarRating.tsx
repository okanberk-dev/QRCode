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
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Stars Row */}
      <div className="flex flex-row gap-1 justify-center items-center w-full">
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= active;
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
              className="focus:outline-none p-1 transition-transform active:scale-90"
            >
              <Star
                size={48}
                className={`transition-colors duration-200 ${
                  isActive
                    ? 'fill-[#fbbc04] text-[#fbbc04]'
                    : 'text-gray-200 fill-gray-100'
                }`}
                strokeWidth={1}
              />
            </button>
          );
        })}
      </div>

      {/* Simplified Label */}
      <div className="h-6 flex items-center justify-center">
        {active > 0 && labels[active] && (
          <span className="text-sm font-medium text-gray-600">
            {labels[active].text}
          </span>
        )}
      </div>
    </div>
  );
}
