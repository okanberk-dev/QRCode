'use client';

/**
 * BigCounter — Stage 66 §38.147 PR0 base.
 *
 * Büyük rakam sayacı + kicker label. Stats şeritleri, dashboard analytics
 * KPI'larında kullanılır. RAF-based count-up framer-motion `useMotionValue`
 * + `animate` API ile (orijinal manuel RAF loop yerine).
 *
 * Pulse §11 disipline: Space Grotesk display 64px + tight tracking + tab
 * pause. Reduced-motion'da target'a hemen atlar (no count animation).
 *
 * Tasarım kararı: Component scroll-triggered (useInView) — viewport'a
 * girince başlar. Page Visibility API entegre framer-motion default
 * davranışı: tab gizliyken animation pause olur.
 *
 * Original: site-library.jsx 6.BigCounter. Konversiyon: useCountUp custom
 * RAF → framer-motion useMotionValue + animate (battery-friendly + tab
 * pause built-in).
 */

import { animate, useMotionValue, useTransform, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface BigCounterProps {
  /** Hedef sayı (sayaç buraya tırmanır). */
  to: number;
  /** Alt label (örn. "Aktif İşletme"). */
  label: string;
  /** Sayıdan önce prefix (örn. "+", "$"). */
  prefix?: string;
  /** Sayıdan sonra suffix (örn. "K", "%", "M"). */
  suffix?: string;
  /** Animasyon süresi ms (default 1800). */
  durationMs?: number;
  /** Locale (number formatting için). Default 'tr'. */
  locale?: 'tr' | 'en';
  /** Tailwind className override. */
  className?: string;
}

export default function BigCounter({
  to,
  label,
  prefix = '',
  suffix = '',
  durationMs = 1800,
  locale = 'tr',
  className,
}: BigCounterProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({
    rootMargin: '100px',
    triggerOnce: true,
    threshold: 0.3,
  });

  const count = useMotionValue(0);
  const formatted = useTransform(count, (latest) => {
    const rounded = Math.round(latest);
    return rounded.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US');
  });

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      count.set(to);
      return;
    }
    const controls = animate(count, to, {
      duration: durationMs / 1000,
      ease: [0.25, 0.1, 0.25, 1],
    });
    return () => controls.stop();
  }, [inView, prefersReducedMotion, to, durationMs, count]);

  return (
    <div ref={ref} className={className}>
      <div
        className="leading-none tracking-[-0.03em] text-brand-ink"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(40px, 6vw, 64px)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {prefix}
        <motion.span>{formatted}</motion.span>
        {suffix}
      </div>
      <span
        className="mt-1.5 inline-block text-[10px] uppercase tracking-[0.18em] text-brand-mute-soft"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
    </div>
  );
}
