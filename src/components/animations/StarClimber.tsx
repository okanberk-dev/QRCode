'use client';

/**
 * StarClimber — Stage 66 §38.147 PR0 base.
 *
 * Yıldız tırmanışı sayacı (3.6 → 4.8 gibi). 5-yıldız ikon row + count-up
 * animation. Dashboard analytics + feature card'larında "rating climbed"
 * hikayesi anlatmak için kullanılır.
 *
 * Pulse §11 disipline: Space Grotesk 56px + tabular-nums + lime accent
 * yıldızlar (filled state). framer-motion useMotionValue + animate
 * (BigCounter ile aynı paterni reuse).
 *
 * Tasarım kararı: Item rotation paterni KALDIRILDI (orijinal 5sn
 * setInterval re-trigger) — viewport'a girince bir kere oynar
 * (triggerOnce, scroll-stutter önler). Sürekli loop semantik anlamlı
 * değil (rating sürekli zıplamaz).
 *
 * Reduced-motion: hedef değer hemen gösterilir, count animation off.
 *
 * Original: site-library.jsx 3.StarClimber. Konversiyon: useCountUp +
 * setInterval re-trigger → framer-motion animate + useInView one-shot.
 */

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface StarClimberProps {
  /** Başlangıç değer (örn. 3.6). */
  from?: number;
  /** Hedef değer (örn. 4.8). */
  to: number;
  /** Animasyon süresi ms (default 1800). */
  durationMs?: number;
  /** Alt label (örn. "Ortalama puan"). */
  label?: string;
  /** Locale. Default 'tr'. */
  locale?: 'tr' | 'en';
  /** Tailwind className override. */
  className?: string;
}

export default function StarClimber({
  from = 0,
  to,
  durationMs = 1800,
  label,
  locale = 'tr',
  className,
}: StarClimberProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({
    rootMargin: '100px',
    triggerOnce: true,
    threshold: 0.3,
  });

  const value = useMotionValue(from);
  const display = useTransform(value, (v) => v.toFixed(1));
  const starCount = useTransform(value, (v) => Math.round(v));

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, {
      duration: durationMs / 1000,
      ease: [0.25, 0.1, 0.25, 1],
    });
    return () => controls.stop();
  }, [inView, prefersReducedMotion, to, durationMs, value]);

  // useTransform yıldız sayısı (motion value), useState ile sync için
  // useEffect kullanma — render'da motion.span olarak gösterilir.
  // Yıldız grid'i için integer round'lanmış değeri ayrı subscribe ediyoruz.
  const stars = [1, 2, 3, 4, 5];

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3.5 ${className ?? ''}`}
    >
      <motion.span
        className="leading-none tracking-[-0.03em] text-brand-ink"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(40px, 5vw, 56px)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {display}
      </motion.span>
      <div>
        <div className="inline-flex items-center gap-0.5">
          {stars.map((n) => (
            <StarIcon key={n} index={n} starCount={starCount} />
          ))}
        </div>
        <span
          className="mt-1 block text-[9px] uppercase tracking-[0.18em] text-brand-mute-soft"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {label ?? (locale === 'tr' ? 'Ortalama puan' : 'Avg. rating')}
        </span>
      </div>
    </div>
  );
}

function StarIcon({
  index,
  starCount,
}: {
  index: number;
  starCount: ReturnType<typeof useTransform<number, number>>;
}) {
  // Filled when index <= rounded count. useTransform her frame değer
  // değişiminde re-render yapmaz; integer round'da sadece eşik geçince
  // değişir (re-render minimal, framer-motion optimization built-in).
  const filled = useTransform(starCount, (count) => count >= index);
  const fill = useTransform(filled, (f) => (f ? '#A8D62E' : 'none'));
  const stroke = useTransform(filled, (f) => (f ? '#A8D62E' : '#D4D4D4'));

  return (
    <motion.span aria-hidden="true">
      <motion.svg
        width={14}
        height={14}
        viewBox="0 0 24 24"
        style={{ display: 'inline-block' }}
      >
        <motion.path
          d="M12 2l2.94 6.36L22 9.27l-5 4.87 1.18 6.86L12 17.77l-6.18 3.23L7 14.14 2 9.27l7.06-.91L12 2z"
          style={{ fill, stroke }}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.span>
  );
}
