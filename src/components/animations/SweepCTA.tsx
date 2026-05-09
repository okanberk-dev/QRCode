'use client';

/**
 * SweepCTA — Stage 66 §38.147 PR0 base.
 *
 * Hover'da lime sweep animation ile graphite → lime renk değişimi yapan
 * primary CTA buton. Marketing surface'lerinde "ücretsiz başla / demo al"
 * gibi action button'larında kullanılır.
 *
 * Pulse §11 disipline: white bg + 1.5px graphite border + black text
 * default; hover'da lime sweep slides in + black text intact (yüksek
 * contrast lime+ink). framer-motion variants ile smooth transition
 * (transform + shadow hardware-accelerated).
 *
 * Stage 90 §38.170: kullanıcı raporu "üstüne gelmeyince siyah font ve
 * buton çerçevesi belli olsun" — default state white bg + visible
 * border + black text (önceki graphite bg + white text yerine). Hover
 * state lime sweep + black text (lime üzerinde yüksek contrast intact).
 *
 * Reduced-motion: LazyMount + framer-motion useReducedMotion otomatik
 * handle. Reduced motion'da hover effect static white kalır (background
 * sweep yok).
 *
 * Original: site-library.jsx 8.SweepCTA. Konversiyon: useState hover →
 * framer-motion whileHover variant + AnimatePresence-friendly.
 *
 * Stage 75 §38.155 — polymorphic `<button>` ↔ `<a>` render. Server
 * Component caller'larında inline `onClick={() => ...}` (Next.js 15
 * "Event handlers cannot be passed to Client Component props" hatası)
 * yerine `href` prop verilebilir; component otomatik `motion.a` render
 * eder. Caller fully serializable (string href). onClick prop button
 * mode'da intact (Client Component caller'lar için).
 */

import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { ReactNode, MouseEventHandler } from 'react';

interface SweepCTAProps {
  /** Buton içeriği (text node veya React fragment). */
  children: ReactNode;
  /**
   * Eğer string verilirse `<a>` (motion.a) render edilir — Server
   * Component caller'lardan serializable olarak geçirilebilir. Aksi
   * halde `<button>` (motion.button) render edilir.
   */
  href?: string;
  /**
   * Anchor hedefi (örn. `_blank`). Sadece `href` modunda aktif.
   * `_blank` durumunda `rel="noopener noreferrer"` otomatik eklenir
   * (CLAUDE.md §37.2 H — window.opener exposure önleme).
   */
  target?: '_self' | '_blank';
  /**
   * Click handler — sadece `<button>` modunda kullanılır (Client
   * Component caller'larından geçirilir). Server Component caller'lar
   * `href` prop'unu tercih etmeli (CLAUDE.md §38.155).
   */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /** A11y label — text içeriği yetersizse override. */
  ariaLabel?: string;
  /** Disabled state (örn. form submit pending). Sadece button modunda anlamlı. */
  disabled?: boolean;
  /** Tailwind className override (margin/padding). */
  className?: string;
}

export default function SweepCTA({
  children,
  href,
  target,
  onClick,
  ariaLabel,
  disabled = false,
  className,
}: SweepCTAProps) {
  const prefersReducedMotion = useReducedMotion();
  const isLink = typeof href === 'string';

  // Pulse §11 utility set (button + anchor ortak).
  // Stage 90 §38.170: white bg + 1.5px graphite border + black text default;
  // hover state lime sweep slides in (foreground stays black for contrast).
  const baseClassName = `group relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border-[1.5px] border-[#0A0A0A] bg-white px-6 py-3.5 text-sm font-semibold text-[#0A0A0A] shadow-[0_8px_20px_-10px_rgba(10,10,10,0.20)] transition-shadow hover:shadow-[0_14px_30px_-10px_rgba(198,242,78,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
    className ?? ''
  }`;
  const baseStyle = { fontFamily: 'var(--font-body)' as const };
  const sharedMotionProps = {
    initial: 'rest' as const,
    animate: 'rest' as const,
    whileHover: disabled ? ('rest' as const) : ('hover' as const),
    whileFocus: disabled ? ('rest' as const) : ('hover' as const),
    whileTap:
      disabled || prefersReducedMotion ? ('rest' as const) : ('tap' as const),
    variants: {
      rest: {},
      hover: {},
      tap: { scale: 0.97 },
    },
  };

  const innerContent = (
    <>
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
      {/* Foreground content — Stage 90 §38.170: text always black
          (rest state on white bg, hover state on lime sweep). Lime
          Pulse §11 token #C6F24E provides sufficient contrast for
          black text (~13:1 contrast ratio, WCAG AAA). */}
      <motion.span
        className="relative z-10 inline-flex items-center gap-1.5"
        variants={{
          rest: { color: '#0A0A0A' },
          hover: { color: '#0A0A0A' },
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
    </>
  );

  if (isLink) {
    // `<a>` semantik link — Server Component caller'larından serializable
    // string href ile mount edilir. CLAUDE.md §37.2 H — `_blank` rel guard.
    return (
      <motion.a
        href={href}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={baseClassName}
        style={baseStyle}
        {...sharedMotionProps}
      >
        {innerContent}
      </motion.a>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={baseClassName}
      style={baseStyle}
      {...sharedMotionProps}
    >
      {innerContent}
    </motion.button>
  );
}
