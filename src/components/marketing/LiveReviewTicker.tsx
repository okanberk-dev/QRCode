'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Review {
  init: string;
  name: string;
  stars: number;
  rating: string;
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
    init: 'M',
    name: 'Mert D.',
    stars: 5,
    rating: '4.8',
    text: {
      tr: 'Çok hızlı ve kaliteli hizmet.',
      en: 'Very fast and high quality service.',
    },
    platform: 'Google',
  },
  {
    init: 'A',
    name: 'Ayşe K.',
    stars: 5,
    rating: '5.0',
    text: {
      tr: 'Servis çok hızlıydı, mekan harika.',
      en: 'Service was fast, place is amazing.',
    },
    platform: 'Tripadvisor',
  },
  {
    init: 'J',
    name: 'Jenny A.',
    stars: 5,
    rating: '4.9',
    text: {
      tr: 'Kahve mükemmeldi, tekrar geleceğim.',
      en: 'Coffee was perfect, will come back.',
    },
    platform: 'Yemeksepeti',
  },
  {
    init: 'S',
    name: 'Sarah B.',
    stars: 5,
    rating: '4.7',
    text: {
      tr: 'Atmosfer çok güzel, personel ilgili.',
      en: 'Great atmosphere, attentive staff.',
    },
    platform: 'Getir',
  },
];

/**
 * Rotating "live stream" review card. Two layouts:
 * - **Mobile (`<sm`)**: single card carousel — one review at a time with
 *   progress dots underneath. Matches the buaze-mobil handoff design.
 * - **Tablet/desktop (`sm+`)**: 3-row stack — top row highlighted, two
 *   stacked below. Matches the desktop hero design.
 *
 * Both layouts auto-cycle every `rotateMs` ms and respect
 * `prefers-reduced-motion: reduce` (rotation disabled, first review shown).
 */
export default function LiveReviewTicker({ locale, rotateMs = 2800 }: Props) {
  const [pivot, setPivot] = useState(0);
  const isTr = locale === 'tr';
  const activeReview = REVIEWS[pivot];

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
    <>
      {/* ─────────────────────────────────────────────────────────────
          Mobile — single-card carousel with progress dots
          ───────────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(198,242,78,0.10),_rgba(20,20,20,0.96)_38%,_#0A0A0A_100%)] p-5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.85)] sm:hidden"
        aria-live="polite"
      >
        {/* Header — live indicator only on mobile */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#16A34A] opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
          </span>
          <span className="pulse-eyebrow text-[#C6F24E]">
            {isTr ? 'AKIŞ' : 'STREAM'}
          </span>
        </div>

        {/* Active review — re-keyed on pivot change to retrigger fade-up */}
        <div key={`m-${pivot}`} className="bz-fade-up mt-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-[14px] font-semibold text-[#0A0A0A]"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              {activeReview.init}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-white">
                {activeReview.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                <span
                  className="font-semibold uppercase tracking-[0.16em] text-[#A3A3A3]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {activeReview.platform}
                </span>
                <span className="font-semibold text-white">
                  {activeReview.rating}
                </span>
                <Star size={11} fill="#C6F24E" strokeWidth={0} />
              </div>
            </div>
          </div>

          <p className="mt-4 text-[15px] leading-relaxed text-white">
            &ldquo;{activeReview.text[isTr ? 'tr' : 'en']}&rdquo;
          </p>

          <div
            className="mt-3 flex items-center gap-1"
            aria-label={`${activeReview.stars} ${isTr ? 'yıldız' : 'stars'}`}
          >
            {Array.from({ length: activeReview.stars }).map((_, i) => (
              <Star key={i} size={14} fill="#C6F24E" strokeWidth={0} />
            ))}
          </div>
        </div>

        {/* Progress dots */}
        <div
          className="mt-5 flex items-center gap-1.5"
          aria-hidden
        >
          {REVIEWS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                i === pivot ? 'w-8 bg-[#C6F24E]' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          Tablet/desktop — 3-row stack (unchanged from previous design)
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(198,242,78,0.12),_rgba(20,20,20,0.96)_35%,_#0A0A0A_100%)] shadow-[0_40px_90px_-40px_rgba(0,0,0,0.88)] sm:block">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3.5 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="pulse-eyebrow text-[#C6F24E]">
              {isTr ? 'AKIŞ' : 'STREAM'}
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
                className={`flex items-center gap-3 rounded-[14px] border px-3.5 py-2.5 transition-all duration-500 ${
                  isTop
                    ? 'border-[#C6F24E]/20 bg-white/[0.08] shadow-[0_12px_28px_-20px_rgba(198,242,78,0.22)]'
                    : 'border-white/10 bg-black/20 opacity-80'
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
                <p className="min-w-0 flex-1 truncate text-[13px] text-white">
                  <strong className="font-semibold">{r.name}</strong>{' '}
                  <span className="text-[#D4D4D4]">{r.text[isTr ? 'tr' : 'en']}</span>
                </p>
                <span
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-[#0A0A0A] px-2 py-1 text-[#C6F24E] ring-1 ring-[#C6F24E]/20"
                  aria-label={`${r.stars} ${isTr ? 'yıldız' : 'stars'}`}
                >
                  {Array.from({ length: r.stars }).map((_, starIndex) => (
                    <Star key={starIndex} size={9} fill="currentColor" strokeWidth={0} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
