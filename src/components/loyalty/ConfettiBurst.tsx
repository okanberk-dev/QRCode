// Confetti burst of the loyalty card (CLAUDE.md §61): the customer's card
// when a reward becomes ready, and the counter when a reward is given.
// Pure CSS (bzl-confetti in loyalty-motion.css); position it with
// `className` inside a relatively positioned parent. Decorative only.
import type { CSSProperties } from 'react';

const COLOURS = ['#111110', '#9B87E0', '#E3F4A6', '#F59E0B', '#EC4899', '#38BDF8'];

export default function ConfettiBurst({
  count = 36,
  reach = 120,
  fall = 160,
  className = '',
}: {
  count?: number;
  /** Base distance in px; pieces fly up to reach + 136 px. */
  reach?: number;
  /** Extra downward drift in px (gravity). */
  fall?: number;
  className?: string;
}) {
  const scale = reach / 120;
  return (
    <div className={`pointer-events-none absolute ${className}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const dist = reach + (i % 5) * 34 * scale;
        const w = i % 3 === 0 ? 10 : 7;
        return (
          <span
            key={i}
            className="bzl-confetti absolute block rounded-[2px]"
            style={
              {
                width: w,
                height: w * 1.6,
                background: COLOURS[i % COLOURS.length],
                animationDelay: `${(i % 6) * 25}ms`,
                ['--dx' as string]: `${Math.round(Math.cos(angle) * dist)}px`,
                ['--dy' as string]: `${Math.round(Math.sin(angle) * dist + fall)}px`,
                ['--rot' as string]: `${(i * 47) % 360}deg`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
