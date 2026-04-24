'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import AnimatedCounter from './AnimatedCounter';

interface Props {
  locale: 'tr' | 'en';
}

interface SnapshotReview {
  initial: string;
  name: string;
  stars: number;
  platform: string;
  text: {
    tr: string;
    en: string;
  };
}

interface Snapshot {
  total: number;
  delta: string;
  dotY: number;
  chartPath: string;
  reviews: SnapshotReview[];
}

const HERO_PULSE_SNAPSHOTS: Snapshot[] = [
  {
    total: 1284,
    delta: '+184%',
    dotY: 8,
    chartPath: 'M0 75 L30 68 L60 72 L90 55 L120 58 L150 40 L180 44 L210 28 L240 34 L270 18 L300 24 L330 12 L360 16 L380 8',
    reviews: [
      {
        initial: 'M',
        name: 'M. Demir',
        stars: 5,
        platform: 'Google',
        text: {
          tr: 'Servis harikaydı, çıkmadan yorum bıraktım.',
          en: 'Service was great, I left a review before leaving.',
        },
      },
      {
        initial: 'A',
        name: 'A. Yılmaz',
        stars: 5,
        platform: 'Tripadvisor',
        text: {
          tr: 'Kahvesi çok iyi, ekip de hızlıydı.',
          en: 'Coffee was excellent and the team moved fast.',
        },
      },
      {
        initial: 'S',
        name: 'S. Kara',
        stars: 4,
        platform: 'Google',
        text: {
          tr: 'Rezervasyon akışı pürüzsüzdü.',
          en: 'The reservation flow felt seamless.',
        },
      },
    ],
  },
  {
    total: 1306,
    delta: '+196%',
    dotY: 12,
    chartPath: 'M0 78 L30 74 L60 64 L90 58 L120 48 L150 52 L180 36 L210 26 L240 30 L270 20 L300 22 L330 16 L360 18 L380 12',
    reviews: [
      {
        initial: 'E',
        name: 'E. Aksoy',
        stars: 5,
        platform: 'Yemeksepeti',
        text: {
          tr: 'Paket çok hızlı geldi, notlar okunmuştu.',
          en: 'Delivery arrived fast and they followed the notes.',
        },
      },
      {
        initial: 'L',
        name: 'L. Stone',
        stars: 5,
        platform: 'Google',
        text: {
          tr: 'Tatlılar için tekrar geleceğiz.',
          en: 'We are coming back for the desserts.',
        },
      },
      {
        initial: 'B',
        name: 'B. Çetin',
        stars: 4,
        platform: 'Tripadvisor',
        text: {
          tr: 'Mekân doluydu ama ekip iyi yönetti.',
          en: 'The place was busy but the team handled it well.',
        },
      },
    ],
  },
  {
    total: 1348,
    delta: '+204%',
    dotY: 10,
    chartPath: 'M0 80 L30 70 L60 66 L90 60 L120 50 L150 42 L180 46 L210 30 L240 22 L270 24 L300 18 L330 10 L360 14 L380 10',
    reviews: [
      {
        initial: 'D',
        name: 'D. Arslan',
        stars: 5,
        platform: 'Google',
        text: {
          tr: 'Yorum bırakmak çok kolaydı, QR akışı temiz.',
          en: 'Leaving feedback was easy, the QR flow is clean.',
        },
      },
      {
        initial: 'N',
        name: 'N. Kaya',
        stars: 5,
        platform: 'Getir',
        text: {
          tr: 'Sipariş sıcak geldi, deneyim çok iyiydi.',
          en: 'The order arrived warm and the experience was strong.',
        },
      },
      {
        initial: 'J',
        name: 'J. Adams',
        stars: 4,
        platform: 'Google',
        text: {
          tr: 'Ekip hızlı yanıt verdi, güven verdi.',
          en: 'The team replied fast and built confidence.',
        },
      },
    ],
  },
  {
    total: 1391,
    delta: '+218%',
    dotY: 6,
    chartPath: 'M0 76 L30 64 L60 60 L90 54 L120 46 L150 38 L180 30 L210 34 L240 20 L270 14 L300 18 L330 8 L360 12 L380 6',
    reviews: [
      {
        initial: 'P',
        name: 'P. Ergin',
        stars: 5,
        platform: 'Google',
        text: {
          tr: 'Şikâyetim aynı gün çözüldü, sonra yoruma döndüm.',
          en: 'My issue was solved the same day, then I updated my review.',
        },
      },
      {
        initial: 'K',
        name: 'K. Moore',
        stars: 5,
        platform: 'Tripadvisor',
        text: {
          tr: 'Atmosfer ve servis birlikte çok güçlü.',
          en: 'Atmosphere and service both feel strong.',
        },
      },
      {
        initial: 'Z',
        name: 'Z. Tunç',
        stars: 4,
        platform: 'Yemeksepeti',
        text: {
          tr: 'Menü daha net, karar vermek kolaylaştı.',
          en: 'The menu is clearer, choosing became easier.',
        },
      },
    ],
  },
];

export default function HomeHeroDashboard({ locale }: Props) {
  const [mounted, setMounted] = useState(false);
  const [snapshotIndex, setSnapshotIndex] = useState(0);
  const isTr = locale === 'tr';

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setMounted(true), reduced ? 0 : 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = setInterval(() => {
      setSnapshotIndex((current) => (current + 1) % HERO_PULSE_SNAPSHOTS.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [mounted]);

  const activeSnapshot = HERO_PULSE_SNAPSHOTS[snapshotIndex];
  const areaPath = `${activeSnapshot.chartPath} L380 100 L0 100 Z`;

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#EDEDED] bg-[radial-gradient(circle_at_top_right,_rgba(198,242,78,0.12),_rgba(255,255,255,0.96)_42%,_#FAFAFA_100%)] p-4 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.18)] sm:p-5">
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#C6F24E]/15 blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                {isTr ? 'Canlı güncelleniyor' : 'Auto-updating live'}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap items-stretch gap-2.5 sm:justify-end">
              <div className="min-w-[120px] rounded-[18px] border border-[#EAEAEA] bg-white/90 px-4 py-3 shadow-[0_18px_34px_-26px_rgba(10,10,10,0.3)] backdrop-blur">
                <p className="pulse-eyebrow text-[#737373]">{isTr ? 'ŞİMDİ' : 'NOW'}</p>
                <div
                  className="mt-1 text-[28px] font-medium tracking-tight text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {mounted ? (
                    <AnimatedCounter
                      key={`hero-count-${snapshotIndex}`}
                      to={activeSnapshot.total}
                      locale={isTr ? 'tr-TR' : 'en-US'}
                    />
                  ) : (
                    <span>0</span>
                  )}
                </div>
              </div>

              <div
                className="sm:bz-float rounded-[18px] bg-[#0A0A0A] px-4 py-3 text-[#EAF9B8] shadow-[0_18px_34px_-24px_rgba(10,10,10,0.45)]"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: 'opacity 320ms ease',
                }}
              >
                <p
                  className="text-[22px] font-semibold leading-none tracking-tight text-[#C6F24E]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {activeSnapshot.delta}
                </p>
                <p className="pulse-eyebrow mt-1 text-[#EAF9B8]/70">
                  {isTr ? 'YORUM ARTIŞI' : 'REVIEW GROWTH'}
                </p>
              </div>
            </div>

            <p className="pulse-eyebrow pr-1 text-[#737373]">
              {isTr ? 'SON 15 DK · OTOMATİK AKIŞ' : 'LAST 15 MIN · LIVE FEED'}
            </p>
          </div>
        </div>

        <div className="rounded-[20px] border border-[#ECECEC] bg-white/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] sm:p-4">
          <svg viewBox="0 0 380 100" className="h-24 w-full" aria-hidden>
            <defs>
              <linearGradient id="heroHpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#C6F24E" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[20, 40, 60, 80].map((y) => (
              <line key={y} x1="0" y1={y} x2="380" y2={y} stroke="#ECECEC" strokeWidth="0.8" />
            ))}
            <path
              key={`area-${snapshotIndex}`}
              d={areaPath}
              fill="url(#heroHpGrad)"
              style={{
                opacity: mounted ? 1 : 0,
                transition: 'opacity 280ms ease',
              }}
            />
            <path
              key={`line-${snapshotIndex}`}
              d={activeSnapshot.chartPath}
              fill="none"
              stroke="#C6F24E"
              strokeWidth="2.75"
              strokeLinecap="round"
              style={{
                strokeDasharray: 620,
                strokeDashoffset: mounted ? 0 : 620,
                transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)',
              }}
            />
            <circle
              key={`dot-${snapshotIndex}`}
              cx="380"
              cy={activeSnapshot.dotY}
              r="4.5"
              fill="#C6F24E"
              stroke="#0A0A0A"
              strokeWidth="1.5"
              style={{
                opacity: mounted ? 1 : 0,
                transition: 'opacity .24s ease',
              }}
            />
          </svg>
        </div>

        <div className="mt-4 grid gap-2.5">
          {activeSnapshot.reviews.map((review, index) => (
            <div
              key={`${snapshotIndex}-${review.name}-${index}`}
              className="flex flex-col gap-3 rounded-[18px] border border-[#EDEDED] bg-white/90 px-3.5 py-3 shadow-[0_18px_30px_-26px_rgba(10,10,10,0.28)] sm:flex-row sm:items-center"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity 420ms ease ${150 + index * 90}ms, transform 420ms ease ${150 + index * 90}ms`,
              }}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF9B8] text-[12px] font-semibold text-[#0A0A0A]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  {review.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[13px] font-semibold text-[#0A0A0A]">{review.name}</strong>
                    <span className="pulse-eyebrow inline-flex rounded-full border border-[#EDEDED] bg-[#FAFAFA] px-2 py-1 text-[#737373]">
                      {review.platform}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-[1.55] text-[#525252] sm:text-[13px]">
                    {review.text[isTr ? 'tr' : 'en']}
                  </p>
                </div>
              </div>
              <span
                className="pulse-star-pill w-fit"
                aria-label={`${review.stars} ${isTr ? 'yıldız' : 'stars'}`}
              >
                {Array.from({ length: review.stars }).map((_, starIndex) => (
                  <Star key={starIndex} size={12} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
