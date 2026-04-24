'use client';

import React from 'react';

interface Props {
  /** Items rendered in the scrolling strip; the full list is duplicated
   *  internally so the CSS transform can loop seamlessly. */
  items: React.ReactNode[];
  /** Short eyebrow label pinned to the left. Optional. */
  eyebrow?: string;
  /** Tailwind class for each item wrapper. */
  itemClassName?: string;
  /** Fade edges so items don't pop in/out abruptly. */
  mask?: boolean;
}

/**
 * Horizontal marquee — CSS-only animation via `@keyframes marqueeSlide`
 * defined in `src/app/globals.css`. Respects `prefers-reduced-motion`
 * (the media query in globals.css disables the animation).
 *
 * Mirrors `.design/site/site-homepage-v3.jsx:484` "Trusted by" strip.
 */
export default function MarqueeRow({ items, eyebrow, itemClassName, mask = true }: Props) {
  const doubled = [...items, ...items];
  return (
    <div className="flex items-center">
      {eyebrow && (
        <div className="pulse-eyebrow shrink-0 px-6 sm:px-10 text-[#A3A3A3]">{eyebrow}</div>
      )}
      <div
        className="flex-1 overflow-hidden"
        style={
          mask
            ? {
                maskImage:
                  'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
                WebkitMaskImage:
                  'linear-gradient(to right, transparent, black 80px, black calc(100% - 80px), transparent)',
              }
            : undefined
        }
      >
        <div className="animate-marquee flex w-max">
          {doubled.map((node, idx) => (
            <div key={idx} className={itemClassName ?? 'shrink-0 px-10'}>
              {node}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
