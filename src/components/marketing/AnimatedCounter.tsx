'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  to: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  durationMs?: number;
  className?: string;
  /** Number-locale for toLocaleString. Defaults to 'tr-TR' (uses dots as grouping). */
  locale?: string;
}

/**
 * Scroll-triggered animated counter. Runs the ease-out tween once when the
 * element enters the viewport (threshold 0.4); matches the behaviour of
 * `Counter` in `.design/site/site-homepage-v3.jsx` (line 10).
 *
 * Respects `prefers-reduced-motion` — renders the final value instantly
 * when the user has reduced motion enabled.
 */
export default function AnimatedCounter({
  to,
  suffix = '',
  prefix = '',
  decimals = 0,
  durationMs = 1600,
  className,
  locale = 'tr-TR',
}: Props) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(to);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / durationMs, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(Number((eased * to).toFixed(decimals)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [to, decimals, durationMs]);

  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
