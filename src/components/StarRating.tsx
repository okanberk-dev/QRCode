'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

export default function StarRating({ rating, onRatingChange }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex flex-row gap-2 sm:gap-4 justify-center items-center py-6">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRatingChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className={`
            relative p-2 transition-all duration-300 transform
            hover:scale-110 active:scale-95 focus:outline-none
            ${(hoverRating || rating) >= star ? 'star-anim-pulse text-[var(--color-accent-500)]' : 'text-gray-300'}
          `}
          aria-label={`${star} Yıldız`}
        >
          <Star
            size={48} // Big touch targets for mobile
            className="transition-colors duration-200"
            fill={(hoverRating || rating) >= star ? 'currentColor' : 'none'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
