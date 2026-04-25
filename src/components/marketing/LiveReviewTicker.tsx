'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Review {
  init: string;
  name: string;
  stars: number;
  text: { tr: string; en: string };
  platform: string;
}

interface Props {
  locale: 'tr' | 'en';
  /** Milliseconds between rotations. Design spec is 2800ms. */
  rotateMs?: number;
}

const REVIEWS: Review[] = [
  {
    init: 'A',
    name: 'Ayşe K.',
    stars: 5,
    text: {
      tr: 'Servis çok hızlıydı, tatlılar harika.',
      en: 'Service was fast, desserts were great.',
    },
    platform: 'Google',
  },
  {
    init: 'M',
    name: 'Mert D.',
    stars: 5,
    text: {
      tr: 'Mekan güzel, ama biraz sesliydi.',
      en: 'Nice place, just a bit loud.',
    },
    platform: 'Yelp',
  },
  {
    init: 'J',
    name: 'Jenny A.',
    stars: 5,
    text: {
      tr: 'Kahve tam istediğim gibi geldi.',
      en: 'Coffee came exactly how I ordered.',
    },
    platform: 'Tripadvisor',
  },
  {
    init: 'S',
    name: 'Sarah B.',
    stars: 5,
    text: {
      tr: 'Harika atmosfer, güler yüzlü ekip!',
      en: 'Great atmosphere and friendly staff!',
    },
    platform: 'Google',
  },
];

/**
 * Rotating "live stream" review card — the 3-row stack auto-cycles every
 * `rotateMs` ms. Mirrors `HeroProduct` in
 * `.design/site/site-homepage-v3.jsx` (line 174 onward).
 *
 * Respects `prefers-reduced-motion` — stops rotating but still shows the
 * three reviews on first render.
 */
export default function LiveReviewTicker({ locale, rotateMs = 2800 }: Props) {
  const [pivot, setPivot] = useState(0);
  const isTr = locale === 'tr';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const t = setInterval(() => {
      setPivot((p) => (p + 1) % REVIEWS.length);
    }, rotateMs);
    return () => clearInterval(t);
  }, [rotateMs]);

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(198,242,78,0.12),_rgba(20,20,20,0.96)_35%,_#0A0A0A_100%)] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.88)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="pulse-eyebrow text-[#C6F24E]">
            {isTr ? 'CANLI AKIŞ' : 'LIVE STREAM'}
          </span>
          <span className="pulse-eyebrow rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[#D4D4D4]">
            {isTr ? '3 YENİ' : '3 NEW'}
          </span>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#C6F24E]/20 bg-black/30 px-3 py-1.5 text-[#EAF9B8]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          </span>
          <span className="pulse-eyebrow text-[#EAF9B8]/80">
            {isTr ? 'AKIŞ AÇIK' : 'STREAM LIVE'}
          </span>
        </div>
      </div>
      <div className="space-y-2.5 p-4 sm:p-5">
        {[0, 1, 2].map((offset) => {
          const r = REVIEWS[(pivot + offset) % REVIEWS.length];
          const isTop = offset === 0;
          return (
            <div
              key={`${pivot}-${offset}`}
              className={`flex items-start gap-3 rounded-[20px] border px-3.5 py-3 transition-all duration-500 ${
                isTop
                  ? 'border-[#C6F24E]/18 bg-white/[0.08] shadow-[0_18px_36px_-26px_rgba(198,242,78,0.18)]'
                  : 'border-white/8 bg-black/20 opacity-80'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  isTop ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-white/10 text-white'
                }`}
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {r.init}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-white">{r.name}</p>
                  <span className="pulse-star-pill shrink-0" aria-label={`${r.stars} ${isTr ? 'yıldız' : 'stars'}`}>
                    {Array.from({ length: r.stars }).map((_, starIndex) => (
                      <Star key={starIndex} size={12} fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                </div>
                <p className="mt-1 text-[12px] leading-[1.55] text-[#D4D4D4] line-clamp-2">
                  {r.text[isTr ? 'tr' : 'en']}
                </p>
                <span className="pulse-eyebrow mt-2 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/55">
                  {r.platform.toUpperCase()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
