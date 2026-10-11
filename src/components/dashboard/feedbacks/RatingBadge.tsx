import { Star } from 'lucide-react';

/**
 * Coloured rating badge for the review inboxes (owner + admin, list rows and
 * detail headers). Replaces the 10px lime-on-black star strip and the lime
 * stars on white (≈1.3:1, below WCAG 1.4.11): the number carries the value,
 * the tone carries the sentiment and the badge has a spoken label, so the
 * rating is never colour-only.
 *
 *   4–5 → lime soft   ·   3 → amber   ·   1–2 → red
 */

export type RatingBadgeSize = 'md' | 'lg';

interface RatingBadgeProps {
  rating: number;
  isTr: boolean;
  size?: RatingBadgeSize;
  className?: string;
}

function toneFor(rating: number): string {
  if (rating >= 4) return 'bg-[#EAF9B8] text-[#0A0A0A] ring-1 ring-inset ring-[#C6F24E]';
  if (rating === 3) return 'bg-[#FEF3C7] text-[#92400E] ring-1 ring-inset ring-[#FDE68A]';
  return 'bg-[#FEE2E2] text-[#991B1B] ring-1 ring-inset ring-[#FECACA]';
}

export function RatingBadge({ rating, isTr, size = 'md', className = '' }: RatingBadgeProps) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-10 w-10 rounded-xl';
  const num = size === 'lg' ? 'text-[20px]' : 'text-[16px]';
  return (
    <span
      role="img"
      aria-label={isTr ? `5 üzerinden ${value} yıldız` : `${value} out of 5 stars`}
      className={`flex shrink-0 flex-col items-center justify-center ${box} ${toneFor(value)} ${className}`}
    >
      <span aria-hidden="true" className={`${num} font-semibold leading-none tabular-nums`}>
        {value}
      </span>
      <Star
        size={size === 'lg' ? 11 : 10}
        className="mt-0.5 fill-current"
        strokeWidth={0}
        aria-hidden="true"
      />
    </span>
  );
}

export default RatingBadge;
