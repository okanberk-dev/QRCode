'use client';

/**
 * FeatureCard — Stage 66 §38.147 PR0 base.
 *
 * Hover'da lime corner reveal + lift animation ile feature explanation
 * kartı. Anasayfa "Neden Buaze" / Features grid'inde kullanılır.
 *
 * Pulse §11 disipline: ivory bg (`bg-brand-bg`) + graphite icon + lime
 * corner orb on hover + small translateY lift.
 *
 * Reduced-motion: framer-motion useReducedMotion ile lift + lime orb
 * disable. Static graphite icon + paper card kalır (final-frame).
 *
 * Original: site-library.jsx 11.FeatureCard. Konversiyon: useState hover
 * → framer-motion whileHover variant + props'tan icon override.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import type { ReactNode } from 'react';

interface FeatureCardProps {
  /** Kart başlığı. */
  title: string;
  /** Kart açıklaması (1-2 cümle). */
  body: string;
  /** Sol üst icon (lucide-react component). Default: Star. */
  icon?: ReactNode;
  /** Click handler — kart anchor link'se caller wrap eder. */
  onClick?: () => void;
  /** Tailwind className override. */
  className?: string;
}

export default function FeatureCard({
  title,
  body,
  icon,
  onClick,
  className,
}: FeatureCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      onClick={onClick}
      // Stage 85 §38.165: mobile padding kompakt (p-5 mobile, p-6 sm:+ desktop spacious).
      // active:scale tap feedback mobile (CLAUDE.md §38.46 + §38.161 paterni).
      className={`group relative box-border h-full cursor-pointer overflow-hidden rounded-[18px] bg-brand-bg p-5 shadow-[0_0_0_1px_rgba(10,10,10,0.06)] active:scale-[0.98] sm:p-6 sm:active:scale-100 ${
        className ?? ''
      }`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      initial="rest"
      animate="rest"
      whileHover={prefersReducedMotion ? 'rest' : 'hover'}
      whileFocus={prefersReducedMotion ? 'rest' : 'hover'}
      variants={{
        rest: { y: 0 },
        hover: { y: -4 },
      }}
      transition={{
        duration: 0.3,
        ease: [0.65, 0, 0.35, 1],
      }}
    >
      {/* Lime corner orb — translate + scale on hover. Decorative,
          pointer-events:none. Reduced motion'da scale: 0 sabit kalır. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-[100px] w-[100px] rounded-full bg-brand-lime"
        variants={{
          rest: { scale: 0 },
          hover: prefersReducedMotion ? { scale: 0 } : { scale: 1.6 },
        }}
        transition={{
          duration: 0.6,
          ease: [0.65, 0, 0.35, 1],
        }}
      />
      <div className="relative">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-ink text-white">
          {icon ?? <Star size={16} fill="currentColor" />}
        </div>
        {/* Stage 85 §38.165: inline fontFamily redundancy kaldırıldı —
            globals.css :where(h1..h6) auto-applies var(--font-heading)
            (Stage 84 §38.164 paterni paralel). Mobile typography: text-[18px]
            mobile + text-[22px] sm:+ (CSS minify — tek class shorthand). */}
        <h3 className="mt-3.5 mb-1.5 text-[18px] sm:text-[22px] leading-tight tracking-[-0.02em] text-brand-ink">
          {title}
        </h3>
        {/* Stage 85 §38.165: body text default Inter font (Tailwind body class)
            inline fontFamily redundancy kaldırıldı. */}
        <p className="m-0 text-[13px] leading-relaxed text-brand-mute-soft">
          {body}
        </p>
      </div>
    </motion.div>
  );
}
