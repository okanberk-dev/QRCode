'use client';

import { useEffect, useRef, useState } from 'react';
import AnimatedCounter from './AnimatedCounter';

interface Props {
  locale: 'tr' | 'en';
}

/**
 * Homepage hero — animated live "YORUM RİTMİ" dashboard card.
 * Mirrors `HeroDashboard` in `.design/site/site-homepage-v2.jsx:64`.
 *
 * Animations (all respect `prefers-reduced-motion`):
 * 1. Chart path reveals via `stroke-dashoffset` (600 → 0 over 1.6s) after
 *    a 600ms mount delay so the hero text paints first.
 * 2. The big number ("1,284") tweens with easeOut via AnimatedCounter.
 * 3. Two review rows fade up in sequence.
 * 4. Floating "+184%" badge oscillates gently (bz-float keyframe).
 * 5. Green "Canlı" dot pulses (bz-pulse-dot keyframe).
 */
export default function HomeHeroDashboard({ locale }: Props) {
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const isTr = locale === 'tr';

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setMounted(true), reduced ? 0 : 600);
    return () => clearTimeout(t);
  }, []);

  const chartPath =
    'M0 75 L30 68 L60 72 L90 55 L120 58 L150 40 L180 44 L210 28 L240 34 L270 18 L300 24 L330 12 L360 16 L380 8';
  const areaPath = `${chartPath} L380 100 L0 100 Z`;

  return (
    <div
      ref={rootRef}
      className="relative rounded-[20px] border border-[#EDEDED] bg-[#FAFAFA] p-5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.18)]"
    >
      {/* Top bar */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="pulse-eyebrow text-[#737373]">
            {isTr ? 'YORUM RİTMİ · CANLI' : 'REVIEW PULSE · LIVE'}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
            </span>
            <span className="text-[11px] font-semibold text-[#16A34A]">
              {isTr ? 'Canlı' : 'Live'}
            </span>
          </div>
        </div>
        <div
          className="text-[28px] font-medium tracking-tight text-[#0A0A0A]"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          {mounted ? (
            <AnimatedCounter to={1284} locale={isTr ? 'tr-TR' : 'en-US'} />
          ) : (
            <span>0</span>
          )}
        </div>
      </div>

      {/* Chart */}
      <svg viewBox="0 0 380 100" className="h-20 w-full" aria-hidden>
        <defs>
          <linearGradient id="heroHpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((y) => (
          <line key={y} x1="0" y1={y} x2="380" y2={y} stroke="#EDEDED" strokeWidth="0.8" />
        ))}
        <path
          d={areaPath}
          fill="url(#heroHpGrad)"
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity 400ms ease 400ms',
          }}
        />
        <path
          d={chartPath}
          fill="none"
          stroke="#C6F24E"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: 600,
            strokeDashoffset: mounted ? 0 : 600,
            transition: 'stroke-dashoffset 1.6s cubic-bezier(.4,0,.2,1)',
          }}
        />
        <circle
          cx="380"
          cy="8"
          r="4"
          fill="#C6F24E"
          style={{
            opacity: mounted ? 1 : 0,
            transition: 'opacity .3s .8s',
          }}
        />
      </svg>

      {/* Mini reviews — staggered fade-up */}
      <div className="mt-4 flex flex-col gap-2">
        {(isTr
          ? [
              { n: 'M. Demir', s: 5, t: 'Servis harikaydı!' },
              { n: 'A. Yılmaz', s: 5, t: 'Kahvesi çok iyi.' },
            ]
          : [
              { n: 'M. Demir', s: 5, t: 'Service was amazing!' },
              { n: 'A. Yılmaz', s: 5, t: 'The coffee was great.' },
            ]
        ).map((r, i) => (
          <div
            key={r.n}
            className="flex items-center gap-2.5 rounded-lg border border-[#EDEDED] bg-white px-3 py-2.5"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 500ms ease ${700 + i * 150}ms, transform 500ms ease ${700 + i * 150}ms`,
            }}
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[11px] font-semibold text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              {r.n.charAt(0)}
            </span>
            <div className="min-w-0 flex-1 text-[12px] text-[#525252]">
              <strong className="font-semibold text-[#0A0A0A]">{r.n}</strong> · {r.t}
            </div>
            <span
              className="pulse-eyebrow rounded bg-[#0A0A0A] px-1.5 py-0.5 text-[#C6F24E]"
              aria-label={`${r.s} yıldız`}
            >
              {'★'.repeat(r.s)}
            </span>
          </div>
        ))}
      </div>

      {/* Floating +184% badge */}
      <div
        className="bz-float absolute -right-3 -top-3 rounded-2xl bg-[#0A0A0A] px-4 py-2.5 text-[#C6F24E] shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
        style={{
          opacity: mounted ? 1 : 0,
          transition: 'opacity 400ms ease 300ms',
        }}
      >
        <p
          className="text-[22px] font-semibold leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          +184%
        </p>
        <p className="pulse-eyebrow mt-1 text-[#C6F24E]/70">
          {isTr ? 'YORUM ARTIŞI' : 'REVIEW GROWTH'}
        </p>
      </div>
    </div>
  );
}
