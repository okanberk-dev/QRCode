'use client';

/**
 * Stage 41 §38.122 — HANDOFF §8 step 8 (Heroes) — Variant v3.
 *
 * Sürekli (loop yok) — mouse-takipli 5 katmanlı 3D kart kümesi.
 * HANDOFF hero-v3.jsx birebir paterni; production polish:
 *  - Pulse §11 utility-first style + lucide icon set
 *  - Reduced-motion: cursor takip kapalı, idle drift kapalı,
 *    static layout (HANDOFF §5.2 disipline)
 *  - Tab pause: idle drift RAF visibility'de teardown (HANDOFF §5.1)
 *  - 5 katman: spotlight (z-bg) + dot grid + 3 floating card + front inbox
 *
 * Animation engine §38.115 reuse YOK — `<Stage>` time-bazlı,
 * Parallax cursor + idle-drift; doğrudan event listener + RAF.
 *
 * Pulse §11 disipline:
 *  - Space Grotesk + tight tracking (italic REDDEDILDI §38.114)
 *  - lime accent + graphite ink + lime-soft chip
 *  - lucide-react icon (Star, Zap, Sparkles, ArrowRight)
 *  - inline hex (#0A0A0A / #C6F24E / #A8D62E / #EAF9B8)
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Sparkles, Star, Zap } from 'lucide-react';
import { layerTransform, normalizeCursorOffset } from './hero-helpers';

interface Props {
  locale: 'tr' | 'en';
}

interface Cursor {
  x: number;
  y: number;
  active: boolean;
}

const COPY = {
  tr: {
    eyebrow: 'BUAZE PULSE — DİJİTAL İTİBAR',
    title: 'Yorumları yönet,\npuanı yükselt',
    subtitle:
      'QR akışları, tek panelde gelen kutusu, Pulse AI yanıt taslakları — tüm itibarınızı bir araya getirir.',
    primaryCta: '14 gün ücretsiz dene',
    secondaryCta: 'Nasıl çalışır?',
    inbox: 'GELEN KUTUSU',
    sentiment: 'DUYGU',
    positive: 'POZİTİF',
    thisMonth: 'BU AY',
    aiBadge: 'PULSE AI',
    aiTone: 'Sıcak yanıt',
    reviews: 'YORUM',
    avgLift: 'ORT. ARTIŞ',
    replyTime: 'YANIT SÜRESİ',
    replyHint: 'YANIT · AI',
    twoMinAgo: '2 dk önce',
    avgPoints: 'puan',
  },
  en: {
    eyebrow: 'BUAZE PULSE — DIGITAL REPUTATION',
    title: 'Manage reviews,\nclimb the rating',
    subtitle:
      'QR flows, unified inbox, Pulse AI reply drafts — your entire reputation in one place.',
    primaryCta: 'Start 14-day free trial',
    secondaryCta: 'How it works?',
    inbox: 'INBOX',
    sentiment: 'SENTIMENT',
    positive: 'POSITIVE',
    thisMonth: 'THIS MONTH',
    aiBadge: 'PULSE AI',
    aiTone: 'Warm reply',
    reviews: 'REVIEWS',
    avgLift: 'AVG LIFT',
    replyTime: 'REPLY TIME',
    replyHint: 'REPLY · AI',
    twoMinAgo: '2 min ago',
    avgPoints: 'pts',
  },
} as const;

const REVIEWS = [
  {
    initial: 'AY',
    name: { tr: 'Ayşe Y.', en: 'Ayse Y.' },
    text: { tr: 'Tatlılar muhteşem, yine geleceğim!', en: 'Desserts amazing, coming back!' },
    stars: 5,
  },
  {
    initial: 'EK',
    name: { tr: 'Emre K.', en: 'Emre K.' },
    text: { tr: 'QR menü çok pratik. Personel ilgili.', en: 'QR menu so practical. Great staff.' },
    stars: 5,
  },
  {
    initial: 'MD',
    name: { tr: 'Mehmet D.', en: 'Mehmet D.' },
    text: { tr: 'Kahve harika, servis biraz yavaştı.', en: 'Coffee great, service a bit slow.' },
    stars: 4,
  },
] as const;

export default function HeroParallax({ locale }: Props): React.ReactElement {
  const copy = COPY[locale];
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<Cursor>({ x: 0.5, y: 0.5, active: false });
  const [idle, setIdle] = useState(0);
  const [reduced, setReduced] = useState(false);

  // Reduced-motion detection (HANDOFF §5.2)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
  }, []);

  // Cursor tracking — disabled when reduced-motion
  useEffect(() => {
    if (reduced) return;
    const el = stageRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const offset = normalizeCursorOffset(e.clientX, e.clientY, rect);
      setCursor({ x: offset.x, y: offset.y, active: true });
    };
    const onLeave = () => setCursor((c) => ({ ...c, active: false }));
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [reduced]);

  // Idle drift (sin/cos when no cursor) — disabled when reduced-motion
  // HANDOFF §5.1 tab pause: visibility hidden iken RAF teardown
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let cancelled = false;
    const t0 = performance.now();
    const step = (now: number): void => {
      if (cancelled) return;
      setIdle((now - t0) / 1000);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const onVisibility = (): void => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        cancelled = true;
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [reduced]);

  // Effective cursor: real cursor when active, idle drift fallback
  const effectiveCursor = cursor.active
    ? cursor
    : reduced
    ? { x: 0.5, y: 0.5, active: false }
    : {
        x: 0.5 + Math.sin(idle * 0.4) * 0.12,
        y: 0.5 + Math.cos(idle * 0.35) * 0.08,
        active: false,
      };

  // Spotlight follows cursor (active) or static center (reduced)
  const spotlightX = effectiveCursor.x * 100;
  const spotlightY = effectiveCursor.y * 100;

  // Inbox review rotator — every 3.2s (also paused under reduced-motion)
  const [reviewIdx, setReviewIdx] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setReviewIdx((i) => (i + 1) % REVIEWS.length);
    }, 3200);
    return () => clearInterval(id);
  }, [reduced]);
  const review = REVIEWS[reviewIdx];

  return (
    <section
      ref={stageRef}
      className="relative min-h-[640px] overflow-hidden bg-[#FAFAFA]"
      style={{ perspective: 1400 }}
      aria-label={locale === 'tr' ? 'Buaze interaktif öne çıkış' : 'Buaze interactive parallax hero'}
    >
      {/* Spotlight (cursor follower) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 800px 500px at ${spotlightX}% ${spotlightY}%, rgba(198,242,78,0.32), transparent 65%)`,
          transition: cursor.active
            ? 'background-image 0.15s linear'
            : 'background-image 0.6s ease',
        }}
      />

      {/* Dot grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(10,10,10,0.07) 1px, transparent 0)',
          backgroundSize: '26px 26px',
          maskImage: 'linear-gradient(to bottom, black 30%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent)',
        }}
      />

      <div className="relative mx-auto flex min-h-[640px] max-w-[1280px] flex-col items-center gap-12 px-5 py-[60px] sm:px-10 lg:flex-row lg:items-center lg:gap-16 lg:py-[88px]">
        {/* SOL: copy */}
        <div className="relative z-10 w-full max-w-[560px]">
          <span className="pulse-eyebrow inline-flex items-center gap-2" style={{ color: '#525252' }}>
            <span aria-hidden className="bz-pulse-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#C6F24E' }} />
            {copy.eyebrow}
          </span>
          <h1
            className="bz-h-tight-2 mt-4 whitespace-pre-line text-[40px] sm:text-[56px] md:text-[68px] lg:text-[80px]"
            style={{
              color: '#0A0A0A',
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
            }}
          >
            {copy.title}
          </h1>
          <p className="mt-6 max-w-[460px] text-[16px] leading-[1.55] text-[#525252] sm:text-[17px]">
            {copy.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/auth/register`}
              className="bz-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold"
            >
              {copy.primaryCta}
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href={`/${locale}/how-it-works`}
              className="bz-btn-ghost inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-5 py-3.5 text-[14px] font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5]"
            >
              {copy.secondaryCta}
            </Link>
          </div>
        </div>

        {/* SAĞ: 3D cluster (5 layers) — hidden on small screens, visible from md */}
        <div
          className="relative hidden h-[540px] w-full max-w-[600px] md:block"
          aria-hidden
        >
          {/* Layer 0a — Sentiment dial card (back, multiplier 0.5) */}
          <div
            className="absolute left-[20px] top-[200px] w-[280px]"
            style={{
              transform: `${layerTransform(effectiveCursor, 0.5)} rotate(-4deg)`,
              transition: cursor.active ? 'transform 0.2s ease-out' : 'transform 0.9s ease',
            }}
          >
            <ClusterSentimentCard
              sentimentLabel={copy.sentiment}
              positiveLabel={copy.positive}
              avgPointsLabel={copy.avgPoints}
            />
          </div>

          {/* Layer 0b — Live bars card (mid-back, multiplier 0.4) */}
          <div
            className="absolute right-0 top-[320px] w-[320px]"
            style={{
              transform: `${layerTransform(effectiveCursor, 0.4)} rotate(3deg)`,
              transition: cursor.active ? 'transform 0.25s ease-out' : 'transform 1s ease',
            }}
          >
            <ClusterLiveBars idle={idle} thisMonthLabel={copy.thisMonth} />
          </div>

          {/* Layer 0c — ROI strip (top, multiplier 0.7) */}
          <div
            className="absolute right-[60px] top-0 w-[380px]"
            style={{
              transform: `${layerTransform(effectiveCursor, 0.7)} rotate(-2deg)`,
              transition: cursor.active ? 'transform 0.2s ease-out' : 'transform 0.85s ease',
            }}
          >
            <ClusterRoi
              reviewsLabel={copy.reviews}
              avgLiftLabel={copy.avgLift}
              replyTimeLabel={copy.replyTime}
            />
          </div>

          {/* Layer 0d — Star burst (back-right, multiplier 0.3) */}
          <div
            className="absolute right-[30px] top-[30px]"
            style={{
              transform: layerTransform(effectiveCursor, 0.3),
              transition: cursor.active ? 'transform 0.3s ease-out' : 'transform 1.1s ease',
            }}
          >
            <span className="inline-flex gap-1 rounded-full bg-[#0A0A0A] px-3.5 py-3 shadow-[0_20px_40px_-10px_rgba(10,10,10,0.4)]">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={16} fill="#C6F24E" color="#A8D62E" aria-hidden />
              ))}
            </span>
          </div>

          {/* Layer 1 — Front inbox card (multiplier 1.0) */}
          <div
            className="absolute left-[110px] top-[80px] w-[380px]"
            style={{
              transform: layerTransform(effectiveCursor, 1.0),
              transition: cursor.active ? 'transform 0.15s ease-out' : 'transform 0.8s ease',
              zIndex: 5,
            }}
          >
            <ClusterInbox
              review={review}
              locale={locale}
              inboxLabel={copy.inbox}
              twoMinAgoLabel={copy.twoMinAgo}
              aiBadge={copy.aiBadge}
              aiTone={copy.aiTone}
            />
            {/* Corner sticker */}
            <span
              className="absolute -left-[18px] -top-[22px] flex items-center gap-2 rounded-2xl px-3.5 py-2.5 shadow-[0_14px_30px_rgba(168,214,46,0.45)]"
              style={{
                background: '#C6F24E',
                transform: 'rotate(-6deg)',
              }}
            >
              <Zap size={14} color="#0A0A0A" aria-hidden />
              <span
                className="bz-h-tight-2 text-[18px]"
                style={{ color: '#0A0A0A', letterSpacing: '-0.02em' }}
              >
                0.8s
              </span>
              <span
                className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]"
                style={{ color: '#0A0A0A' }}
              >
                {copy.replyHint}
              </span>
            </span>
          </div>
        </div>

        {/* MOBILE fallback — single inbox card (md:hidden) */}
        <div className="relative w-full max-w-[400px] md:hidden">
          <ClusterInbox
            review={review}
            locale={locale}
            inboxLabel={copy.inbox}
            twoMinAgoLabel={copy.twoMinAgo}
            aiBadge={copy.aiBadge}
            aiTone={copy.aiTone}
          />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Cluster: sentiment dial card (back layer)
// ─────────────────────────────────────────────────────────────

function ClusterSentimentCard({
  sentimentLabel,
  positiveLabel,
  avgPointsLabel,
}: {
  sentimentLabel: string;
  positiveLabel: string;
  avgPointsLabel: string;
}) {
  return (
    <div className="rounded-[18px] bg-[#0A0A0A] p-4 text-white shadow-[0_30px_60px_-25px_rgba(10,10,10,0.55)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
          {sentimentLabel}
        </span>
        <span
          className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{
            background: 'rgba(198,242,78,0.18)',
            color: '#C6F24E',
            padding: '3px 8px',
            borderRadius: 999,
          }}
        >
          {positiveLabel}
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-3">
        <svg width="120" height="80" viewBox="0 0 140 100" aria-hidden>
          <path
            d="M 14 70 A 56 56 0 0 1 126 70"
            fill="none"
            stroke="#222"
            strokeWidth={9}
            strokeLinecap="round"
          />
          <path
            d="M 14 70 A 56 56 0 0 1 110 38"
            fill="none"
            stroke="#C6F24E"
            strokeWidth={9}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(198,242,78,0.5))' }}
          />
          <circle cx="110" cy="38" r="4" fill="#FFFFFF" />
        </svg>
        <div>
          <div className="flex items-baseline gap-1">
            <span
              className="bz-h-tight-2 text-[34px]"
              style={{ color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              86
            </span>
            <span className="text-[14px] text-white/40">/100</span>
          </div>
          <span className="mt-1 block text-[10px] text-white/55">
            ↑ 14 {avgPointsLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cluster: live bars (this month)
// ─────────────────────────────────────────────────────────────

function ClusterLiveBars({ idle, thisMonthLabel }: { idle: number; thisMonthLabel: string }) {
  // Deterministic bar heights based on idle time + index — no Math.random for SSR
  const bars = Array.from({ length: 16 }, (_, i) => {
    const phase = idle * 0.6 + i * 0.5;
    const base = 50 + Math.sin(phase) * 18 + Math.cos(phase * 0.7) * 12;
    return Math.max(35, Math.min(85, base));
  });

  return (
    <div className="rounded-[18px] bg-white p-4 shadow-[0_30px_60px_-25px_rgba(10,10,10,0.18)] ring-1 ring-[rgba(10,10,10,0.05)]">
      <div className="flex items-start justify-between">
        <div>
          <span className="pulse-eyebrow" style={{ color: '#525252' }}>
            {thisMonthLabel}
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="bz-h-tight-2 text-[24px]"
              style={{ color: '#0A0A0A', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              1,426
            </span>
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{
                background: '#C6F24E',
                color: '#0A0A0A',
                padding: '2px 6px',
                borderRadius: 4,
              }}
            >
              +212%
            </span>
          </div>
        </div>
        <div className="flex h-12 items-end gap-[3px]">
          {bars.map((h, i) => {
            const tail = bars.length - 1 - i;
            const accent = tail < 3;
            return (
              <span
                key={i}
                className="block w-[6px] rounded-[2px]"
                style={{
                  height: `${h}%`,
                  background: accent ? '#C6F24E' : '#0A0A0A',
                  opacity: accent ? 1 : 0.3 + (i / bars.length) * 0.5,
                  transition: 'height 600ms cubic-bezier(.65,0,.35,1)',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cluster: ROI strip (3-stat grid)
// ─────────────────────────────────────────────────────────────

function ClusterRoi({
  reviewsLabel,
  avgLiftLabel,
  replyTimeLabel,
}: {
  reviewsLabel: string;
  avgLiftLabel: string;
  replyTimeLabel: string;
}) {
  const stats = [
    { v: '340K+', l: reviewsLabel },
    { v: '+4.8★', l: avgLiftLabel },
    { v: '%72↓', l: replyTimeLabel },
  ];
  return (
    <div className="grid grid-cols-3 rounded-[18px] bg-white py-1 shadow-[0_30px_60px_-25px_rgba(10,10,10,0.2)] ring-1 ring-[rgba(10,10,10,0.05)]">
      {stats.map((s, i) => (
        <div
          key={s.l}
          className="px-3 py-3.5"
          style={{
            borderLeft: i > 0 ? '1px solid #EDEDED' : 'none',
          }}
        >
          <span
            className="bz-h-tight-2 block text-[22px]"
            style={{ color: '#0A0A0A', letterSpacing: '-0.02em', lineHeight: 1 }}
          >
            {s.v}
          </span>
          <span
            className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: '#525252', display: 'block', marginTop: 4 }}
          >
            {s.l}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cluster: front inbox (rotating reviews)
// ─────────────────────────────────────────────────────────────

function ClusterInbox({
  review,
  locale,
  inboxLabel,
  twoMinAgoLabel,
  aiBadge,
  aiTone,
}: {
  review: typeof REVIEWS[number];
  locale: 'tr' | 'en';
  inboxLabel: string;
  twoMinAgoLabel: string;
  aiBadge: string;
  aiTone: string;
}) {
  return (
    <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_30px_60px_-25px_rgba(10,10,10,0.3)] ring-1 ring-[rgba(10,10,10,0.04)]">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[rgba(10,10,10,0.05)] px-4 py-3">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[#0A0A0A]">
          <Star size={11} fill="#C6F24E" color="#C6F24E" aria-hidden />
        </span>
        <span className="pulse-eyebrow" style={{ color: '#0A0A0A' }}>
          {inboxLabel}
        </span>
        <span
          className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ color: '#16A34A' }}
        >
          <span
            aria-hidden
            className="inline-block h-[6px] w-[6px] rounded-full"
            style={{
              background: '#16A34A',
              animation: 'bzPulse 1.4s infinite',
            }}
          />
          LIVE
        </span>
      </div>
      {/* Body — rotates with `review` */}
      <div key={review.initial} className="p-4" style={{ animation: 'bzFadeUp 0.5s ease' }}>
        <div className="flex gap-3">
          <span
            className="bz-h-tight-2 flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-full text-[14px]"
            style={{ background: '#EAF9B8', color: '#0A0A0A', letterSpacing: '-0.01em' }}
          >
            {review.initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-semibold text-[#0A0A0A]">
                {review.name[locale]}
              </span>
              <span className="inline-flex gap-0.5">
                {Array.from({ length: review.stars }, (_, i) => (
                  <Star key={i} size={10} fill="#C6F24E" color="#A8D62E" aria-hidden />
                ))}
              </span>
            </div>
            <p className="mt-1 text-[13px] leading-[1.4] text-[#525252]">
              {review.text[locale]}
            </p>
            <span
              className="mt-2 block font-mono text-[9px] uppercase tracking-[0.18em]"
              style={{ color: '#737373' }}
            >
              Google · {twoMinAgoLabel}
            </span>
          </div>
        </div>
        {/* AI draft preview */}
        <div
          className="mt-3 rounded-[10px] p-3 text-[12.5px] leading-[1.4] text-[#0A0A0A]"
          style={{ background: '#EAF9B8' }}
        >
          <span className="pulse-eyebrow inline-flex items-center gap-1.5" style={{ color: '#0A0A0A' }}>
            <Sparkles size={10} color="#A8D62E" aria-hidden />
            {aiBadge}
          </span>
          <p className="mt-1 text-[12.5px]">{aiTone}</p>
        </div>
      </div>
    </div>
  );
}
