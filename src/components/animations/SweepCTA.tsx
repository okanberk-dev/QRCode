'use client';

/**
 * SweepCTA — Stage 66 §38.147 PR0 base.
 *
 * Hover'da lime sweep animation ile graphite → lime renk değişimi yapan
 * primary CTA buton. Marketing surface'lerinde "ücretsiz başla / demo al"
 * gibi action button'larında kullanılır.
 *
 * Pulse §11 disipline: graphite ink default + lime sweep on hover + arrow
 * icon offset. framer-motion variants ile smooth transition (transform
 * + color hardware-accelerated).
 *
 * Reduced-motion: LazyMount + framer-motion useReducedMotion otomatik
 * handle. Reduced motion'da hover effect static graphite kalır (background
 * sweep yok, color flip yok).
 *
 * Original: site-library.jsx 8.SweepCTA. Konversiyon: useState hover →
 * framer-motion whileHover variant + AnimatePresence-friendly.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { ReactNode, MouseEventHandler } from 'react';

interface SweepCTAProps {
  /** Buton içeriği (text node veya React fragment). */
  children: ReactNode;
  /** Click handler — `<a>` linkse onClick + href birleştirilebilir caller'da. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** A11y label — text içeriği yetersizse override. */
  ariaLabel?: string;
  /** Disabled state (örn. form submit pending). */
  disabled?: boolean;
  /** Tailwind className override (margin/padding). */
  className?: string;
}

export default function SweepCTA({
  children,
  onClick,
  ariaLabel,
  disabled = false,
  className,
}: SweepCTAProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border-0 bg-brand-ink px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_-10px_rgba(10,10,10,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        className ?? ''
      }`}
      style={{ fontFamily: 'var(--font-body)' }}
      initial="rest"
      animate="rest"
      whileHover={disabled ? 'rest' : 'hover'}
      whileFocus={disabled ? 'rest' : 'hover'}
      whileTap={disabled || prefersReducedMotion ? 'rest' : 'tap'}
      variants={{
        rest: {},
        hover: {},
        tap: { scale: 0.97 },
      }}
    >
      {/* Lime sweep background — translateX -100% → 0 on hover. CSS-friendly
          motion.span transform animasyon, GPU-accelerated. Reduced motion'da
          framer-motion variant atlanır (hover state'i visual no-op olur). */}
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 bg-brand-lime"
        variants={{
          rest: { x: '-100%' },
          hover: prefersReducedMotion ? { x: '-100%' } : { x: 0 },
        }}
        transition={{
          duration: 0.5,
          ease: [0.65, 0, 0.35, 1],
        }}
      />
      {/* Foreground content — color flip white ↔ ink. */}
      <motion.span
        className="relative z-10 inline-flex items-center gap-1.5"
        variants={{
          rest: { color: '#FFFFFF' },
          hover: prefersReducedMotion ? { color: '#FFFFFF' } : { color: '#0A0A0A' },
        }}
        transition={{ duration: 0.3 }}
      >
        {children}
        <motion.span
          aria-hidden="true"
          className="inline-flex"
          variants={{
            rest: { x: 0 },
            hover: prefersReducedMotion ? { x: 0 } : { x: 4 },
          }}
          transition={{ duration: 0.3 }}
        >
          <ArrowRight size={16} strokeWidth={2.25} />
        </motion.span>
      </motion.span>
    </motion.button>
  );
}
