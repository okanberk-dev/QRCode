'use client';

/**
 * Marquee — Stage 66 §38.147 PR0 base.
 *
 * Yatay kayan logo şeridi (CSS-only animation, GPU accelerated).
 * Marketing surface'lerinde "Trusted by" / platform logo cloud için
 * kullanılır.
 *
 * Pulse §11 disipline: Space Grotesk italic alternation + muted-soft
 * default + maskImage edge fade. CSS @keyframes `brand-marquee`
 * (tailwind.config.ts'te tanımlı) — JS RAF YOK (battery save +
 * 60fps mobil + tab gizli iken otomatik pause).
 *
 * Reduced-motion: framer-motion useReducedMotion ile static stack
 * (ilk N item visible, animation off).
 *
 * Original: site-library.jsx 7.Marquee. Konversiyon: inline style →
 * brand-marquee utility + props ile customizable items array.
 *
 * Tasarım: items array 3x duplicate edilir (orijinal hardcoded array
 * yerine generic prop). React.memo ile re-render guard.
 */

import { memo } from 'react';
import { useReducedMotion } from 'framer-motion';

interface MarqueeProps {
  /** Şeritte gösterilecek item'lar (text veya React node). */
  items: string[];
  /**
   * Animation süresi saniye. Default 22 (CSS keyframe ile match —
   * tailwind.config.ts brand-marquee 22s linear infinite).
   */
  durationSec?: number;
  /**
   * Item arası gap (px). Default 56 (HANDOFF spec birebir).
   */
  gapPx?: number;
  /**
   * Edge mask fade (default true). False = sert kenar (kart içinde
   * embed durumda kapama gerekirse).
   */
  mask?: boolean;
  /**
   * Italic alternation (her 2. item italic) — orijinal site-library
   * paterni. Default true.
   */
  italicAlternate?: boolean;
  /** Tailwind className override. */
  className?: string;
}

function MarqueeImpl({
  items,
  durationSec = 22,
  gapPx = 56,
  mask = true,
  italicAlternate = true,
  className,
}: MarqueeProps) {
  const prefersReducedMotion = useReducedMotion();

  // 3x duplicate for seamless loop (CSS animation 0 → -50% translateX
  // ile orta çift'e döner, ekrandan kayma yok).
  const tripled = [...items, ...items, ...items];

  // Reduced motion: tek satır static, animation off.
  if (prefersReducedMotion) {
    return (
      <div className={`w-full overflow-hidden ${className ?? ''}`}>
        <div
          className="inline-flex whitespace-nowrap py-3"
          style={{ gap: `${gapPx}px` }}
        >
          {items.map((label, idx) => (
            <span
              key={`${label}-${idx}`}
              className="shrink-0 text-[clamp(20px,3vw,32px)] tracking-[-0.02em] text-brand-mute-soft"
              style={{
                fontFamily: 'var(--font-heading)',
                fontStyle: italicAlternate && idx % 2 ? 'italic' : 'normal',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full overflow-hidden ${className ?? ''}`}
      style={
        mask
          ? {
              maskImage:
                'linear-gradient(90deg, transparent, black 10%, black 90%, transparent)',
              WebkitMaskImage:
                'linear-gradient(90deg, transparent, black 80px, black calc(100% - 80px), transparent)',
            }
          : undefined
      }
    >
      <div
        className="inline-flex whitespace-nowrap py-3"
        style={{
          gap: `${gapPx}px`,
          animation: `brand-marquee ${durationSec}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {tripled.map((label, idx) => (
          <span
            key={`${label}-${idx}`}
            className="shrink-0 text-[clamp(20px,3vw,32px)] tracking-[-0.02em] text-brand-mute-soft"
            style={{
              fontFamily: 'var(--font-heading)',
              fontStyle: italicAlternate && idx % 2 ? 'italic' : 'normal',
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

const Marquee = memo(MarqueeImpl);
Marquee.displayName = 'Marquee';
export default Marquee;
