'use client';

/**
 * Stage 41 §38.122 — HANDOFF §8 step 8 (Heroes) — Variant v2.
 *
 * 8 saniyelik loop, "veri kanıtlayıcı" karakter:
 *  - Headline'da `3.6 → 4.8` sayaç (`useCountUp` reuse, §38.115)
 *  - 90 günlük climb chart (12 weekly point, line + area + dots)
 *  - "Buaze kohortu, ilk 90 gün ortalama" CLAUDE.md §35.8 disclosure
 *
 * Animation engine: §38.115 `<Stage>` + chart point reveal — tab pause
 * (§5.1) + reduced-motion (§5.2) disipline otomatik.
 *
 * Pulse §11 disipline:
 *  - Space Grotesk + tight tracking (italic REDDEDILDI §38.114)
 *  - JetBrains Mono uppercase eyebrow + counter
 *  - lime accent line + lime-soft area fill + graphite ink
 *  - lucide TrendingUp / Star / ArrowRight
 *  - Synthetic italic Space Grotesk (CLAUDE.md §38.112) "kohort" disclosure
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Star, TrendingUp } from 'lucide-react';
import { Stage } from '@/lib/anim/stage';
import { Sprite } from '@/lib/anim/sprite';
import { useCountUp } from '@/lib/buaze';
import { animate, clamp, interpolate } from '@/lib/anim/interpolate';
import { Easing } from '@/lib/anim/easing';
import { generateClimbCurve, STAR_CLIMB_DURATION } from './hero-helpers';

interface Props {
  locale: 'tr' | 'en';
}

const COPY = {
  tr: {
    eyebrow: 'BUAZE KOHORTU · İLK 90 GÜN',
    titleLead: 'Ortalamanız ',
    titleTail: 'puana çıkıyor.',
    subtitle:
      'Buaze müşteri kohortunda ortalama puan ilk 90 günde belirgin biçimde yükseliyor — çünkü her müşterinin sesi tek panelden duyuluyor.',
    primaryCta: '14 gün ücretsiz dene',
    secondaryCta: 'Nasıl çalışır',
    chartLabel: '90 GÜNLÜK ORTALAMA PUAN',
    weekLabel: 'Hafta',
    cohortNote:
      'Buaze müşteri kohortu · gerçek müşteri data anonim agrega · sektör + lokasyon değişkenlik gösterebilir',
  },
  en: {
    eyebrow: 'BUAZE COHORT · FIRST 90 DAYS',
    titleLead: 'Your average climbs to ',
    titleTail: 'stars.',
    subtitle:
      'In the Buaze customer cohort, average rating climbs noticeably in the first 90 days — because every customer is heard from one dashboard.',
    primaryCta: 'Start 14-day free trial',
    secondaryCta: 'How it works',
    chartLabel: '90-DAY AVG. RATING',
    weekLabel: 'Week',
    cohortNote:
      'Buaze customer cohort · anonymized real-customer aggregate · sector + location variance applies',
  },
} as const;

const CLIMB_DATA = generateClimbCurve(3.6, 4.8, 12);
const TARGET_RATING = 4.8;

export default function HeroStarClimb({ locale }: Props): React.ReactElement {
  const copy = COPY[locale];
  const [reduced, setReduced] = useState(false);

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

  // useCountUp drives the "3.6 → 4.8" ticker — duration synced to first
  // half of the 8s loop so the chart reveal can take the second half.
  const counterValue = useCountUp(TARGET_RATING, reduced ? 0 : 3000);

  return (
    <section
      className="relative min-h-[640px] overflow-hidden bg-[#FAFAFA]"
      aria-label={locale === 'tr' ? 'Buaze kohort kanıtı' : 'Buaze cohort proof'}
    >
      {/* Soft lime corner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[200px] top-[40%] h-[420px] w-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(198,242,78,0.32), transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex min-h-[640px] max-w-[1280px] flex-col items-center gap-12 px-5 py-[60px] sm:px-10 lg:flex-row lg:items-center lg:gap-16 lg:py-[88px]">
        {/* SOL: copy + sayaç */}
        <div className="relative z-10 w-full max-w-[560px]">
          <span className="pulse-eyebrow inline-flex items-center gap-2" style={{ color: '#525252' }}>
            <span aria-hidden className="bz-pulse-dot inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#C6F24E' }} />
            {copy.eyebrow}
          </span>

          <h1
            className="bz-h-tight-2 mt-4 text-[38px] sm:text-[52px] md:text-[60px] lg:text-[68px]"
            style={{ color: '#0A0A0A', lineHeight: 0.97, letterSpacing: '-0.03em' }}
          >
            {copy.titleLead}
            <span className="inline-flex items-baseline gap-1.5">
              <span style={{ color: '#A8D62E' }}>
                {counterValue.toFixed(1)}
              </span>
              <Star
                size={48}
                strokeWidth={1.5}
                fill="#C6F24E"
                color="#A8D62E"
                className="inline-block translate-y-[-6px]"
                aria-hidden
              />
            </span>{' '}
            {copy.titleTail}
          </h1>

          <p className="mt-6 max-w-[480px] text-[16px] leading-[1.55] text-[#525252] sm:text-[17px]">
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
              <TrendingUp size={14} aria-hidden />
              {copy.secondaryCta}
            </Link>
          </div>

          {/* Cohort disclosure (CLAUDE.md §35.8) */}
          <p className="mt-6 max-w-[460px] text-[11.5px] leading-[1.55] text-[#737373]">
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontStyle: 'italic',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              ✦
            </span>{' '}
            {copy.cohortNote}
          </p>
        </div>

        {/* SAĞ: 90-day climb chart */}
        <div className="relative w-full max-w-[520px]">
          <div className="rounded-[24px] border border-[#EDEDED] bg-white p-6 shadow-[0_24px_60px_-30px_rgba(10,10,10,0.18)]">
            <div className="flex items-center justify-between">
              <span className="pulse-eyebrow" style={{ color: '#525252' }}>
                {copy.chartLabel}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.14em]"
                style={{ background: '#EAF9B8', color: '#0A0A0A' }}
              >
                +1.2 ★
              </span>
            </div>

            <div className="relative mt-5">
              <Stage duration={STAR_CLIMB_DURATION} loop>
                <ClimbChart data={CLIMB_DATA} weekLabel={copy.weekLabel} />
              </Stage>
            </div>

            {/* Highlight stat row */}
            <div className="mt-6 grid grid-cols-3 gap-4 border-t border-[#EDEDED] pt-5">
              <StatCell label={locale === 'tr' ? 'BAŞLANGIÇ' : 'START'} value="3.6" />
              <StatCell label={locale === 'tr' ? 'BUGÜN' : 'TODAY'} value="4.8" accent />
              <StatCell label={locale === 'tr' ? 'ARTIŞ' : 'CHANGE'} value="+1.2" accent />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Climb chart — line + area, dots reveal sequentially
// ─────────────────────────────────────────────────────────────

interface ChartPoint {
  week: number;
  value: number;
}

function ClimbChart({ data, weekLabel }: { data: readonly ChartPoint[]; weekLabel: string }) {
  const width = 460;
  const height = 200;
  const paddingX = 24;
  const paddingY = 28;
  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  // Y axis: clamp to 3.0–5.0 for visual punch (not 0–5)
  const yMin = 3;
  const yMax = 5;
  const ySpan = yMax - yMin;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * innerW;
    const y = paddingY + innerH - ((d.value - yMin) / ySpan) * innerH;
    return { x, y, value: d.value, week: d.week };
  });

  return (
    <Sprite>
      {({ progress }) => {
        // Reveal first half of loop (0–4s of 8s); idle plateau second half
        const reveal = clamp(progress * 2, 0, 1);
        const visibleCount = Math.max(2, Math.ceil(reveal * points.length));
        const visible = points.slice(0, visibleCount);

        // Build path (line)
        const linePath = visible
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' ');

        // Build area (closed path under the line)
        const areaPath = visible.length > 0
          ? `${linePath} L ${visible[visible.length - 1].x.toFixed(1)} ${(paddingY + innerH).toFixed(1)} L ${visible[0].x.toFixed(1)} ${(paddingY + innerH).toFixed(1)} Z`
          : '';

        // Last point pulsing accent
        const last = visible[visible.length - 1];
        const lastPulse = animate({ from: 0, to: 1, ease: Easing.easeOutCubic, end: 1 })(reveal);

        return (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block w-full"
            role="img"
            aria-label={`${weekLabel} ${visible[0]?.week ?? 1}–${last?.week ?? 12}`}
          >
            {/* Y axis tick lines */}
            {[3, 3.5, 4, 4.5, 5].map((v) => {
              const y = paddingY + innerH - ((v - yMin) / ySpan) * innerH;
              return (
                <g key={v}>
                  <line
                    x1={paddingX}
                    x2={width - paddingX}
                    y1={y}
                    y2={y}
                    stroke="#EDEDED"
                    strokeDasharray="2 4"
                    aria-hidden
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#A3A3A3"
                    fontFamily="var(--font-mono)"
                    aria-hidden
                  >
                    {v.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            {areaPath && (
              <path
                d={areaPath}
                fill="url(#climbGradient)"
                aria-hidden
              />
            )}

            <defs>
              <linearGradient id="climbGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#C6F24E" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#C6F24E" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#A8D62E"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            />

            {/* Dots */}
            {visible.map((p, i) => {
              const isLast = i === visible.length - 1;
              return (
                <circle
                  key={p.week}
                  cx={p.x}
                  cy={p.y}
                  r={isLast ? 5 : 3}
                  fill={isLast ? '#0A0A0A' : '#A8D62E'}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  opacity={isLast ? lastPulse : 1}
                />
              );
            })}

            {/* Last point glow */}
            {last && (
              <circle
                cx={last.x}
                cy={last.y}
                r={10}
                fill="none"
                stroke="#C6F24E"
                strokeWidth={2}
                opacity={lastPulse * 0.6}
                aria-hidden
              />
            )}

            {/* Last point label */}
            {last && (
              <g
                transform={`translate(${Math.min(last.x, width - paddingX - 60)}, ${Math.max(paddingY + 14, last.y - 18)})`}
                opacity={lastPulse}
              >
                <rect
                  x="0"
                  y="-12"
                  width="56"
                  height="20"
                  rx="10"
                  fill="#0A0A0A"
                  aria-hidden
                />
                <text
                  x="28"
                  y="2"
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#C6F24E"
                  fontFamily="var(--font-mono)"
                  letterSpacing="0.04em"
                >
                  {last.value.toFixed(1)} ★
                </text>
              </g>
            )}

            {/* X axis week labels (sparse) */}
            {[0, Math.floor(data.length / 2), data.length - 1].map((idx) => {
              const p = points[idx];
              if (!p) return null;
              return (
                <text
                  key={idx}
                  x={p.x}
                  y={height - paddingY + 16}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#A3A3A3"
                  fontFamily="var(--font-mono)"
                  aria-hidden
                >
                  {idx === 0
                    ? '0'
                    : idx === data.length - 1
                    ? '90'
                    : `${interpolate([0, data.length - 1], [0, 90])(idx).toFixed(0)}`}
                </text>
              );
            })}
          </svg>
        );
      }}
    </Sprite>
  );
}

function StatCell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <span className="pulse-eyebrow block" style={{ color: '#737373' }}>
        {label}
      </span>
      <span
        className="bz-h-tight-2 mt-1 block text-[24px]"
        style={{
          color: accent ? '#A8D62E' : '#0A0A0A',
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
      </span>
    </div>
  );
}
