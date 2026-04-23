'use client';

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
    <div className="rounded-2xl border border-[#222] bg-[#111] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#222] bg-[#0A0A0A] px-4 py-3">
        <span className="pulse-eyebrow text-[#C6F24E]">
          {isTr ? 'CANLI AKIŞ' : 'LIVE STREAM'}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#16A34A] animate-ping absolute opacity-60" aria-hidden />
          <span className="relative h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          <span className="pulse-eyebrow text-[#A3A3A3]">
            {isTr ? '3 YENİ' : '3 NEW'}
          </span>
        </div>
      </div>
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((offset) => {
          const r = REVIEWS[(pivot + offset) % REVIEWS.length];
          const isTop = offset === 0;
          return (
            <div
              key={`${pivot}-${offset}`}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-all duration-500 ${
                isTop
                  ? 'bg-[#161616] border-[#2A2A2A]'
                  : 'bg-[#111] border-[#222] opacity-70'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  isTop ? 'bg-[#C6F24E] text-[#0A0A0A]' : 'bg-[#1A1A1A] text-white'
                }`}
                style={{ fontFamily: 'var(--font-space-grotesk)' }}
              >
                {r.init}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-white truncate">{r.name}</p>
                  <span className="pulse-eyebrow text-[#C6F24E] shrink-0">
                    {'★'.repeat(r.stars)}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-[#A3A3A3] line-clamp-2">
                  {r.text[isTr ? 'tr' : 'en']}
                </p>
                <p className="pulse-eyebrow mt-1 text-[#737373]">{r.platform.toUpperCase()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
