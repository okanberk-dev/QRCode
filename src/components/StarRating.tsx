'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

const labels: Record<number, { text: string; color: string }> = {
  1: { text: 'Çok Kötü', color: 'text-red-500' },
  2: { text: 'Kötü', color: 'text-orange-500' },
  3: { text: 'Orta', color: 'text-yellow-500' },
  4: { text: 'İyi', color: 'text-lime-500' },
  5: { text: 'Mükemmel', color: 'text-green-500' },
};

export default function StarRating({ rating, onRatingChange }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const active = hoverRating || rating;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-row gap-3 sm:gap-4 justify-center items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onTouchStart={() => setHoverRating(star)}
            onTouchEnd={() => { onRatingChange(star); setHoverRating(0); }}
            aria-label={`${star} yıldız`}
            className="group relative transition-transform duration-150 active:scale-90 focus:outline-none"
            style={{ transform: star <= active ? 'scale(1.08)' : 'scale(1)' }}
          >
            <Star
              size={52}
              className={`transition-all duration-200 drop-shadow-sm ${
                star <= active
                  ? 'fill-[#FDBF1D] text-[#FDBF1D] drop-shadow-[0_0_10px_rgba(251,191,29,0.5)]'
                  : 'text-gray-200 fill-gray-100 group-hover:text-gray-300'
              }`}
              strokeWidth={1.2}
            />
          </button>
        ))}
      </div>

      {/* Label */}
      <div className="h-7 flex items-center justify-center">
        {active > 0 && (
          <span className={`text-base font-bold transition-all duration-200 ${labels[active]?.color || 'text-gray-600'}`}>
            {labels[active]?.text}
          </span>
        )}
        {active === 0 && (
          <span className="text-sm text-gray-400 font-medium">Bir puan seçin</span>
        )}
      </div>
    </div>
  );
}
