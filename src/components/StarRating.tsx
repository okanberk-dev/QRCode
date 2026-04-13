'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

const labels: Record<number, { text: string; emoji: string; color: string; bg: string }> = {
  1: { text: 'Çok Kötü', emoji: '😞', color: 'text-red-500', bg: 'bg-red-50' },
  2: { text: 'Kötü', emoji: '😕', color: 'text-orange-500', bg: 'bg-orange-50' },
  3: { text: 'Orta', emoji: '😐', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  4: { text: 'İyi', emoji: '😊', color: 'text-lime-600', bg: 'bg-lime-50' },
  5: { text: 'Mükemmel', emoji: '🤩', color: 'text-green-600', bg: 'bg-green-50' },
};

export default function StarRating({ rating, onRatingChange }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const active = hoverRating || rating;

  return (
    <div className="flex flex-col items-center gap-5 sm:gap-6 w-full">
      {/* Stars Row */}
      <div className="flex flex-row gap-2.5 sm:gap-4 justify-center items-center w-full">
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
              className="group relative transition-all duration-200 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDBF1D] focus-visible:ring-offset-2 rounded-xl p-1.5 sm:p-2 -m-1.5 sm:-m-2"
            >
              {/* Glow ring on active */}
              {isActive && (
                <div className="absolute inset-0 bg-[#FDBF1D]/10 rounded-xl scale-110 transition-transform" />
              )}
              <Star
                size={44}
                className={`relative z-10 transition-all duration-200 ${
                  isActive
                    ? 'fill-[#FDBF1D] text-[#FDBF1D] drop-shadow-[0_0_12px_rgba(253,191,29,0.4)]'
                    : 'text-gray-200 fill-gray-100 group-hover:text-gray-300 group-hover:fill-gray-200'
                }`}
                strokeWidth={1}
              />
            </button>
          );
        })}
      </div>

      {/* Label Badge */}
      <div className="h-9 flex items-center justify-center">
        {active > 0 && labels[active] && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 ${labels[active].bg}`}>
            <span className="text-base">{labels[active].emoji}</span>
            <span className={`text-sm font-bold ${labels[active].color}`}>
              {labels[active].text}
            </span>
          </div>
        )}
        {active === 0 && (
          <span className="text-sm text-gray-400 font-medium">Bir puan seçin</span>
        )}
      </div>
    </div>
  );
}
