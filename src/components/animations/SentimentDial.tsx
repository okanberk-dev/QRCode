'use client';

/**
 * SentimentDial — Stage 66 §38.147 PR0 base.
 *
 * Animasyonlu yarım-daire gauge (sentiment skoru gösterimi). Dashboard
 * analytics + Google Reviews health check kartlarında kullanılır.
 *
 * Pulse §11 disipline: graphite track + lime fill arc + drop shadow
 * lime glow + Space Grotesk numerik display. framer-motion useMotionValue
 * + animate ile arc length tween.
 *
 * Tasarım kararı: Dark variant default (HANDOFF spec — graphite arka
 * plan üzerinde lime fill). Light variant için `variant="light"` prop
 * (graphite track + lime fill + ink display). useInView one-shot — score
 * değiştiğinde scroll-back tekrar tetiklemez.
 *
 * Reduced-motion: arc final state'te hemen, count display target.
 *
 * Original: site-library.jsx 5.SentimentDial. Konversiyon: useCountUp →
 * framer-motion useMotionValue + useTransform; manuel arc compute polar
 * geometry intact (saf SVG).
 */

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface SentimentDialProps {
  /** Skor (0-100). */
  score: number;
  /** Variant — dark (default, graphite bg uyumu) veya light (white card). */
  variant?: 'dark' | 'light';
  /** Animasyon süresi ms (default 1800). */
  durationMs?: number;
  /** A11y label (override). */
  ariaLabel?: string;
  /** Tailwind className override. */
  className?: string;
}

const SVG_W = 140;
const SVG_H = 100;
const ARC_R = 56;
const ARC_CX = 70;
const ARC_CY = 70;
const ARC_START_DEG = -200; // sol-aşağı
const ARC_END_DEG = 20; // sağ-aşağı
const ARC_SWEEP = ARC_END_DEG - ARC_START_DEG; // 220°

function polar(deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [ARC_CX + ARC_R * Math.cos(rad), ARC_CY + ARC_R * Math.sin(rad)];
}

function arcPath(a0: number, a1: number): string {
  const [x0, y0] = polar(a0);
  const [x1, y1] = polar(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${ARC_R} ${ARC_R} 0 ${large} 1 ${x1} ${y1}`;
}

export default function SentimentDial({
  score,
  variant = 'dark',
  durationMs = 1800,
  ariaLabel,
  className,
}: SentimentDialProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView({
    rootMargin: '100px',
    triggerOnce: true,
    threshold: 0.3,
  });

  const value = useMotionValue(0);
  // Arc end angle = startA + sweep × (v / 100)
  const arcEndDeg = useTransform(value, (v) => ARC_START_DEG + ARC_SWEEP * (v / 100));
  const fillPath = useTransform(arcEndDeg, (deg) => arcPath(ARC_START_DEG, deg));
  const tipX = useTransform(arcEndDeg, (deg) => polar(deg)[0]);
  const tipY = useTransform(arcEndDeg, (deg) => polar(deg)[1]);
  const display = useTransform(value, (v) => Math.round(v).toString());

  useEffect(() => {
    if (!inView) return;
    const target = Math.max(0, Math.min(100, score));
    if (prefersReducedMotion) {
      value.set(target);
      return;
    }
    const controls = animate(value, target, {
      duration: durationMs / 1000,
      ease: [0.25, 0.1, 0.25, 1],
    });
    return () => controls.stop();
  }, [inView, prefersReducedMotion, score, durationMs, value]);

  const trackStroke = variant === 'dark' ? '#222222' : '#EDEDED';
  const displayColor = variant === 'dark' ? '#FFFFFF' : '#0A0A0A';
  const displayMuteColor = variant === 'dark' ? 'rgba(255,255,255,0.4)' : 'rgba(10,10,10,0.4)';

  return (
    <div
      ref={ref}
      className={`relative ${className ?? ''}`}
      style={{ width: SVG_W, height: SVG_H }}
      role="img"
      aria-label={ariaLabel ?? `Sentiment score: ${score} of 100`}
    >
      <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        {/* Track (full sweep) */}
        <path
          d={arcPath(ARC_START_DEG, ARC_END_DEG)}
          fill="none"
          stroke={trackStroke}
          strokeWidth={10}
          strokeLinecap="round"
        />
        {/* Lime fill (animated) */}
        <motion.path
          d={fillPath}
          fill="none"
          stroke="#C6F24E"
          strokeWidth={10}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px rgba(198,242,78,0.5))' }}
        />
        {/* Tip indicator */}
        <motion.circle cx={tipX} cy={tipY} r={4} fill="#FFFFFF" />
      </svg>
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center"
        style={{ top: 60 }}
      >
        <motion.span
          className="leading-none tracking-[-0.02em]"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 28,
            color: displayColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {display}
        </motion.span>
        <span
          className="ml-0.5 text-[11px]"
          style={{ color: displayMuteColor }}
        >
          /100
        </span>
      </div>
    </div>
  );
}
