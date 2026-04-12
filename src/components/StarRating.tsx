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
          className="group relative transition-all duration-200 active:scale-90"
        >
          <Star
            size={48}
            className={`transition-all duration-300 ${
              star <= (hoverRating || rating)
                ? 'fill-[#fbbc04] text-[#fbbc04] scale-110'
                : 'text-gray-200 fill-transparent'
            } group-hover:drop-shadow-[0_0_8px_rgba(251,188,4,0.3)]`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
